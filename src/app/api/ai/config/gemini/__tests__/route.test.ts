import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/ai-engine", () => ({
  getAiEngineUrl: () => "http://127.0.0.1:8000",
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock("@/services/system.service", () => ({
  invalidateConfigCache: vi.fn(),
}))

import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { POST } from "../route"

const CLAVE_GUARDADA = "AIzaSyGuardada1234567890abcd"

function peticion(body: unknown) {
  return new NextRequest("http://localhost:3001/api/ai/config/gemini", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("GEMINI_API_KEY", "")
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "1", role: "JEFE" },
    expires: "",
  } as never)
  vi.mocked(prisma.systemConfig.upsert).mockResolvedValue({} as never)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("POST /api/ai/config/gemini", () => {
  it("cambia solo el modelo con la clave guardada, sin pedirla de nuevo", async () => {
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue({ geminiApiKey: CLAVE_GUARDADA } as never)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }))

    const res = await POST(peticion({ model: "gemini-3.5-flash" }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain("gemini-3.5-flash")
    expect(data.gemini.configured).toBe(true)

    // El motor de IA recibe la clave guardada con el modelo nuevo
    const enviado = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(enviado).toEqual({ apiKey: CLAVE_GUARDADA, model: "gemini-3.5-flash" })

    // En la base solo se actualiza el modelo; la clave no se toca
    const upsert = vi.mocked(prisma.systemConfig.upsert).mock.calls[0][0]
    expect(upsert.update).toEqual({ geminiModel: "gemini-3.5-flash" })
  })

  it("sin clave nueva ni clave guardada pide la clave", async () => {
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue({ geminiApiKey: null } as never)

    const res = await POST(peticion({ model: "gemini-3.5-flash" }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("Ingresa la API Key")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(prisma.systemConfig.upsert).not.toHaveBeenCalled()
  })

  it("si el modelo nuevo falla, no guarda nada y explica el motivo", async () => {
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue({ geminiApiKey: CLAVE_GUARDADA } as never)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "modelo no disponible" }), { status: 400 })
    )

    const res = await POST(peticion({ model: "gemini-3.5-flash" }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("No se pudo cambiar al modelo gemini-3.5-flash: modelo no disponible")
    expect(prisma.systemConfig.upsert).not.toHaveBeenCalled()
  })

  it("una clave nueva se valida y se guarda junto con el modelo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }))
    const nueva = "AIzaSyNueva0987654321zyxwvu"

    const res = await POST(peticion({ apiKey: nueva, model: "gemini-3.1-flash-lite" }))

    expect(res.status).toBe(200)
    const upsert = vi.mocked(prisma.systemConfig.upsert).mock.calls[0][0]
    expect(upsert.update).toEqual({ geminiApiKey: nueva, geminiModel: "gemini-3.1-flash-lite" })
    expect(prisma.systemConfig.findFirst).not.toHaveBeenCalled()
  })

  it("desvincula la clave solo con la acción explícita", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))

    const res = await POST(peticion({ action: "delete", model: "gemini-3.1-flash-lite" }))

    expect(res.status).toBe(200)
    expect((await res.json()).gemini.configured).toBe(false)
    const upsert = vi.mocked(prisma.systemConfig.upsert).mock.calls[0][0]
    expect(upsert.update).toEqual({ geminiApiKey: null, geminiModel: "gemini-3.1-flash-lite" })
  })

  it("rechaza a un MESERO", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "2", role: "MESERO" },
      expires: "",
    } as never)

    const res = await POST(peticion({ model: "gemini-3.5-flash" }))
    expect(res.status).toBe(403)
  })
})
