import { describe, it, expect, afterEach, vi } from "vitest"
import net from "net"
import fs from "fs"
import { buscarPuertoLibre, getAiEngineUrl, puertoLibre, usaMotorRemoto } from "../ai-engine"

function abrirServidor(): Promise<{ servidor: net.Server; puerto: number }> {
  return new Promise((resolve) => {
    const servidor = net.createServer((socket) => socket.end())
    servidor.listen(0, "127.0.0.1", () => {
      resolve({ servidor, puerto: (servidor.address() as net.AddressInfo).port })
    })
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("dirección del motor de IA", () => {
  it("usa AI_ENGINE_URL cuando apunta a otro contenedor (Docker)", () => {
    vi.stubEnv("AI_ENGINE_URL", "http://siger-ai:8000/")
    expect(usaMotorRemoto()).toBe(true)
    expect(getAiEngineUrl()).toBe("http://siger-ai:8000")
  })

  it("ignora un AI_ENGINE_URL local y usa el puerto elegido por el sistema en 127.0.0.1", () => {
    vi.stubEnv("AI_ENGINE_URL", "http://localhost:8000")
    vi.spyOn(fs, "readFileSync").mockReturnValue("8003")
    expect(usaMotorRemoto()).toBe(false)
    expect(getAiEngineUrl()).toBe("http://127.0.0.1:8003")
  })

  it("sin puerto anotado usa el preferido", () => {
    vi.stubEnv("AI_ENGINE_URL", "")
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT")
    })
    expect(getAiEngineUrl()).toBe("http://127.0.0.1:8000")
  })
})

describe("búsqueda de puerto libre", () => {
  it("un puerto con otra aplicación escuchando no está libre", async () => {
    const { servidor, puerto } = await abrirServidor()
    try {
      expect(await puertoLibre(puerto)).toBe(false)
    } finally {
      servidor.close()
    }
  })

  it("salta el puerto ocupado y devuelve el siguiente libre", async () => {
    const { servidor, puerto } = await abrirServidor()
    try {
      const elegido = await buscarPuertoLibre(puerto, 5)
      expect(elegido).not.toBeNull()
      expect(elegido).not.toBe(puerto)
      expect(elegido as number).toBeGreaterThan(puerto)
    } finally {
      servidor.close()
    }
  })
})
