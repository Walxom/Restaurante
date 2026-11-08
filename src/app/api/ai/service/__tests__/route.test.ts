import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth/next"
import { GET, POST } from "../route"

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
})
