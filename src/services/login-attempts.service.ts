/**
 * Bloqueo temporal por intentos de inicio de sesión fallidos (RNF de seguridad).
 *
 * Reglas:
 *   - 3 fallos dentro de una ventana de 30 min bloquean el usuario 15 min.
 *   - Un inicio de sesión correcto limpia los intentos.
 *   - Para usuarios existentes el registro se guarda en la tabla `users`, así el
 *     bloqueo sobrevive a un reinicio del servidor.
 *   - Para nombres de usuario que no existen se guarda en memoria: evita crear filas
 *     por cada nombre inventado y sigue frenando la enumeración por fuerza bruta.
 */
import { prisma } from "@/lib/prisma"

export const MAX_INTENTOS = 3
export const BLOQUEO_MS = 15 * 60 * 1000
export const VENTANA_MS = 30 * 60 * 1000

type Registro = { count: number; primerFallo: number; bloqueadoHasta: number }

const globalParaIntentos = globalThis as unknown as { intentosUsuariosInexistentes?: Map<string, Registro> }
const memoria: Map<string, Registro> =
  globalParaIntentos.intentosUsuariosInexistentes ?? (globalParaIntentos.intentosUsuariosInexistentes = new Map())

async function leer(username: string): Promise<{ enBD: boolean; registro: Registro | null }> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { failedLoginAttempts: true, firstFailedLoginAt: true, lockedUntil: true },
  })
  if (!user) return { enBD: false, registro: memoria.get(username) ?? null }
  if (user.failedLoginAttempts === 0 && !user.lockedUntil) return { enBD: true, registro: null }
  return {
    enBD: true,
    registro: {
      count: user.failedLoginAttempts,
      primerFallo: user.firstFailedLoginAt?.getTime() ?? 0,
      bloqueadoHasta: user.lockedUntil?.getTime() ?? 0,
    },
  }
}

async function guardar(username: string, enBD: boolean, registro: Registro | null): Promise<void> {
  if (!enBD) {
    if (registro) memoria.set(username, registro)
    else memoria.delete(username)
    return
  }
  await prisma.user.update({
    where: { username },
    data: {
      failedLoginAttempts: registro?.count ?? 0,
      firstFailedLoginAt: registro ? new Date(registro.primerFallo) : null,
      lockedUntil: registro?.bloqueadoHasta ? new Date(registro.bloqueadoHasta) : null,
    },
  })
}

/** true si el usuario está bloqueado ahora. Limpia un bloqueo ya vencido. */
export async function estaBloqueado(username: string, ahora = Date.now()): Promise<boolean> {
  const { enBD, registro } = await leer(username)
  if (!registro) return false
  if (registro.bloqueadoHasta > ahora) return true
  // Solo se limpia un bloqueo vencido; los intentos que aún no llegan al límite se conservan.
  if (registro.bloqueadoHasta > 0) await guardar(username, enBD, null)
  return false
}

/** Registra un fallo y bloquea al llegar a MAX_INTENTOS dentro de la ventana. */
export async function registrarFallo(username: string, ahora = Date.now()): Promise<void> {
  const { enBD, registro } = await leer(username)
  const vigente = registro && ahora - registro.primerFallo <= VENTANA_MS ? registro : null
  const nuevo: Registro = vigente
    ? { ...vigente, count: vigente.count + 1 }
    : { count: 1, primerFallo: ahora, bloqueadoHasta: 0 }
  if (nuevo.count >= MAX_INTENTOS) nuevo.bloqueadoHasta = ahora + BLOQUEO_MS
  await guardar(username, enBD, nuevo)
}

/** Limpia los intentos tras un inicio de sesión correcto (sin escribir si no hay nada). */
export async function limpiarIntentos(username: string): Promise<void> {
  const { enBD, registro } = await leer(username)
  if (registro) await guardar(username, enBD, null)
}
