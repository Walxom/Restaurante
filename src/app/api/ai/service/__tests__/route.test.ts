import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

// El puerto real del equipo no debe influir en las pruebas
vi.mock("@/lib/ai-engine", () => ({
  PUERTO_PREFERIDO: 8000,
  getAiEngineUrl: () => "http://127.0.0.1:8000",
  leerPuertoLocal: () => 8000,
  usaMotorRemoto: vi.fn(() => false),
  buscarPuertoLibre: vi.fn(),
  guardarPuertoLocal: vi.fn(),
}))

vi.mock("child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("child_process")>()
  return { ...real, spawn: vi.fn(() => ({ pid: 4321, unref: vi.fn() })) }
})

import { getServerSession } from "next-auth/next"
import { GET, POST } from "../route"
import { buscarPuertoLibre, guardarPuertoLocal, usaMotorRemoto } from "@/lib/ai-engine"
import { spawn } from "child_process"
import fs from "fs"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("API /api/ai/service", () => {
  const reqGet = new NextRequest("http://localhost:3000/api/ai/service")

  it("rechaza GET con 401 si no hay sesión autenticada", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET(reqGet)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("No autorizado")
  })

  it("rechaza GET con 403 si el rol no es JEFE", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "Mesero", role: "MESERO" },
      expires: "2099-01-01",
    })

    const response = await GET(reqGet)
    expect(response.status).toBe(403)
  })

  it("permite GET si el usuario es JEFE", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "Jefe", role: "JEFE" },
      expires: "2099-01-01",
    })

    const response = await GET(reqGet)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(typeof data.data.isRunning).toBe("boolean")
    expect(data.data.port).toBe(8000)
  })

  it("rechaza POST con 401 si no hay sesión autenticada", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const reqPost = new NextRequest("http://localhost:3000/api/ai/service", {
      method: "POST",
      body: JSON.stringify({ action: "start" }),
    })

    const response = await POST(reqPost)
    expect(response.status).toBe(401)
  })

  it("rechaza POST con 403 si el rol no es JEFE", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "Mesero", role: "MESERO" },
      expires: "2099-01-01",
    })

    const reqPost = new NextRequest("http://localhost:3000/api/ai/service", {
      method: "POST",
      body: JSON.stringify({ action: "start" }),
    })

    const response = await POST(reqPost)
    expect(response.status).toBe(403)
  })

  it("procesa POST stop exitosamente para usuario JEFE", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "Jefe", role: "JEFE" },
      expires: "2099-01-01",
    })

    const reqPost = new NextRequest("http://localhost:3000/api/ai/service", {
      method: "POST",
      body: JSON.stringify({ action: "stop" }),
    })

    const response = await POST(reqPost)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.isRunning).toBe(false)
  })

  describe("POST start", () => {
    const reqStart = () =>
      new NextRequest("http://localhost:3000/api/ai/service", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      })

    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "1", name: "Jefe", role: "JEFE" },
        expires: "2099-01-01",
      })
      // Sin PID guardado: no hay un arranque en curso
      vi.spyOn(fs, "existsSync").mockImplementation((p) => !String(p).endsWith(".pid"))
      vi.spyOn(fs, "openSync").mockReturnValue(99)
      vi.spyOn(fs, "writeSync").mockReturnValue(0)
      vi.spyOn(fs, "closeSync").mockReturnValue(undefined)
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it("si otra aplicación ocupa el puerto, arranca el motor en el siguiente libre sin pedir nada al usuario", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ status: "healthy", app: "Otra aplicación" }),
        })
      )
      vi.mocked(buscarPuertoLibre).mockResolvedValue(8001)

      const response = await POST(reqStart())
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.port).toBe(8001)
      expect(guardarPuertoLocal).toHaveBeenCalledWith(8001)
      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain("8001")
    })

    it("no lanza otro proceso si el motor de SIGER ya responde", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ status: "ok", service: "ai-engine" }),
        })
      )

      const response = await POST(reqStart())
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain("ya se encuentra en ejecución")
      expect(spawn).not.toHaveBeenCalled()
    })

    it("explica el problema si no queda ningún puerto libre", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
      vi.mocked(buscarPuertoLibre).mockResolvedValue(null)

      const response = await POST(reqStart())
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.details).toContain("No hay puertos libres")
      expect(spawn).not.toHaveBeenCalled()
    })

    it("no intenta lanzar el motor cuando corre en otro contenedor (Docker)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
      vi.mocked(usaMotorRemoto).mockReturnValueOnce(true)

      const response = await POST(reqStart())
      expect(response.status).toBe(409)
      expect(spawn).not.toHaveBeenCalled()
    })
  })
})
