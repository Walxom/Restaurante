import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  BLOQUEO_MS,
  VENTANA_MS,
  estaBloqueado,
  limpiarIntentos,
  registrarFallo,
} from "../login-attempts.service"

const T0 = new Date("2026-11-24T12:00:00Z").getTime()
const findUnique = vi.mocked(prisma.user.findUnique)
const update = vi.mocked(prisma.user.update)

/** Simula la fila del usuario en BD y aplica los update sobre ella. */
function usuarioEnBD(inicial: { failedLoginAttempts: number; firstFailedLoginAt: Date | null; lockedUntil: Date | null }) {
  const fila = { ...inicial }
  findUnique.mockImplementation((async () => ({ ...fila })) as never)
  update.mockImplementation((async (args: { data: typeof fila }) => {
    Object.assign(fila, args.data)
    return fila
  }) as never)
  return fila
}

const limpio = { failedLoginAttempts: 0, firstFailedLoginAt: null, lockedUntil: null }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("login-attempts.service — usuario existente (persistente en BD)", () => {
  it("bloquea al tercer fallo y lo guarda en la tabla users", async () => {
    const fila = usuarioEnBD(limpio)
    await registrarFallo("jefe", T0)
    await registrarFallo("jefe", T0 + 1000)
    expect(await estaBloqueado("jefe", T0 + 2000)).toBe(false)
    await registrarFallo("jefe", T0 + 2000)

    expect(fila.failedLoginAttempts).toBe(3)
    expect(fila.lockedUntil?.getTime()).toBe(T0 + 2000 + BLOQUEO_MS)
    expect(await estaBloqueado("jefe", T0 + 3000)).toBe(true)
  })

  it("el bloqueo sobrevive a un reinicio: se lee de la BD", async () => {
    usuarioEnBD({ failedLoginAttempts: 3, firstFailedLoginAt: new Date(T0), lockedUntil: new Date(T0 + BLOQUEO_MS) })
    expect(await estaBloqueado("jefe", T0 + 60_000)).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it("limpia un bloqueo vencido y deja volver a intentar", async () => {
    const fila = usuarioEnBD({ failedLoginAttempts: 3, firstFailedLoginAt: new Date(T0), lockedUntil: new Date(T0 + BLOQUEO_MS) })
    expect(await estaBloqueado("jefe", T0 + BLOQUEO_MS + 1)).toBe(false)
    expect(fila).toMatchObject({ failedLoginAttempts: 0, firstFailedLoginAt: null, lockedUntil: null })
  })

  it("no borra los intentos que aún no llegan al límite", async () => {
    const fila = usuarioEnBD({ failedLoginAttempts: 2, firstFailedLoginAt: new Date(T0), lockedUntil: null })
    expect(await estaBloqueado("jefe", T0 + 1000)).toBe(false)
    expect(update).not.toHaveBeenCalled()
    expect(fila.failedLoginAttempts).toBe(2)
  })

  it("reinicia el conteo si el primer fallo quedó fuera de la ventana de 30 min", async () => {
    const fila = usuarioEnBD({ failedLoginAttempts: 2, firstFailedLoginAt: new Date(T0), lockedUntil: null })
    await registrarFallo("jefe", T0 + VENTANA_MS + 1)
    expect(fila.failedLoginAttempts).toBe(1)
    expect(fila.lockedUntil).toBeNull()
  })

  it("un inicio de sesión correcto limpia los intentos", async () => {
    const fila = usuarioEnBD({ failedLoginAttempts: 2, firstFailedLoginAt: new Date(T0), lockedUntil: null })
    await limpiarIntentos("jefe")
    expect(fila.failedLoginAttempts).toBe(0)
  })

  it("no escribe en BD al iniciar sesión si no había intentos", async () => {
    usuarioEnBD(limpio)
    await limpiarIntentos("jefe")
    expect(await estaBloqueado("jefe", T0)).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
})

describe("login-attempts.service — usuario inexistente (en memoria)", () => {
  beforeEach(() => {
    findUnique.mockResolvedValue(null)
  })

  it("bloquea nombres inventados sin escribir en la BD", async () => {
    const nombre = `fantasma-${Math.random()}`
    await registrarFallo(nombre, T0)
    await registrarFallo(nombre, T0 + 1)
    await registrarFallo(nombre, T0 + 2)
    expect(await estaBloqueado(nombre, T0 + 3)).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it("libera el nombre al vencer el bloqueo y al limpiar", async () => {
    const nombre = `fantasma-${Math.random()}`
    for (let i = 0; i < 3; i++) await registrarFallo(nombre, T0)
    expect(await estaBloqueado(nombre, T0 + BLOQUEO_MS + 1)).toBe(false)
    await registrarFallo(nombre, T0 + BLOQUEO_MS + 2)
    await limpiarIntentos(nombre)
    expect(await estaBloqueado(nombre, T0 + BLOQUEO_MS + 3)).toBe(false)
  })
})
