/**
 * Dirección del motor de IA (FastAPI).
 *
 * - Docker o motor en otra máquina: AI_ENGINE_URL con un host que no es local
 *   (por ejemplo http://siger-ai:8000) se usa tal cual.
 * - Instalación local: el motor corre en 127.0.0.1 y el puerto lo elige el sistema.
 *   Quien lo arranca (el botón de la web o `pnpm ai:start`) busca un puerto libre
 *   desde AI_PORT (8000 por defecto) y lo anota en logs/ai-engine.port; la web lo lee
 *   de ahí en cada consulta. Así, si otra aplicación ocupa el 8000, el usuario no
 *   tiene que configurar nada.
 *
 * Se usa 127.0.0.1 y no "localhost": en Windows "localhost" puede resolverse a ::1,
 * donde WSL o Docker reenvían puertos de otras aplicaciones.
 */
import fs from "fs"
import net from "net"
import path from "path"

export const ARCHIVO_PUERTO = path.join(process.cwd(), "logs", "ai-engine.port")
export const PUERTO_PREFERIDO = Number(process.env.AI_PORT) || 8000

function sinBarraFinal(url: string): string {
  let fin = url.length
  while (fin > 0 && url[fin - 1] === "/") fin--
  return url.slice(0, fin)
}

function esHostLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1"
  } catch {
    return false
  }
}

/** true cuando el motor corre en otro contenedor u otra máquina (Docker). */
export function usaMotorRemoto(): boolean {
  const fija = process.env.AI_ENGINE_URL
  return Boolean(fija) && !esHostLocal(fija as string)
}

export function leerPuertoLocal(): number {
  try {
    const puerto = Number.parseInt(fs.readFileSync(ARCHIVO_PUERTO, "utf-8").trim(), 10)
    if (puerto > 0 && puerto < 65536) return puerto
  } catch {
    // Sin archivo: todavía no se arrancó el motor desde este equipo
  }
  return PUERTO_PREFERIDO
}

export function guardarPuertoLocal(puerto: number): void {
  fs.mkdirSync(path.dirname(ARCHIVO_PUERTO), { recursive: true })
  fs.writeFileSync(ARCHIVO_PUERTO, String(puerto), "utf-8")
}

export function getAiEngineUrl(): string {
  if (usaMotorRemoto()) return sinBarraFinal(process.env.AI_ENGINE_URL as string)
  return `http://127.0.0.1:${leerPuertoLocal()}`
}

function alguienResponde(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: puerto })
    socket.setTimeout(400)
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("timeout", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => resolve(false))
  })
}

function sePuedeAbrir(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const servidor = net.createServer()
    servidor.once("error", () => resolve(false))
    servidor.listen(puerto, "127.0.0.1", () => servidor.close(() => resolve(true)))
  })
}

/**
 * Un puerto está libre si nadie responde en 127.0.0.1 y además se puede abrir.
 * Hacen falta las dos pruebas: en Windows, el reenvío de WSL puede responder en
 * un puerto que igual deja abrirse, y otra aplicación puede tenerlo abierto sin responder.
 */
export async function puertoLibre(puerto: number): Promise<boolean> {
  if (await alguienResponde(puerto)) return false
  return sePuedeAbrir(puerto)
}

export async function buscarPuertoLibre(desde = PUERTO_PREFERIDO, intentos = 20): Promise<number | null> {
  for (let puerto = desde; puerto < desde + intentos; puerto++) {
    if (await puertoLibre(puerto)) return puerto
  }
  return null
}
