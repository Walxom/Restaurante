import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { GET } from "../route"

describe("Endpoint SRE: /api/public/health", () => {
  const originalFetch = global.fetch
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("responde HTTP 200 con status 'ok' cuando SQLite y AI Engine están operativos", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as unknown as Response)

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("ok")
    expect(data.system).toBe("siger-ia")
    expect(data.components.database.status).toBe("up")
    expect(data.components.database.engine).toBe("sqlite")
    expect(data.components.aiEngine.status).toBe("up")
    expect(typeof data.uptimeSeconds).toBe("number")
    expect(typeof data.components.memory.heapUsedMb).toBe("number")
    expect(typeof data.latencyMs).toBe("number")
    expect(response.headers.get("Cache-Control")).toContain("no-store")
  })

  it("responde HTTP 200 con status 'degraded' cuando la BD funciona pero la IA no responde", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }])
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("degraded")
    expect(data.components.database.status).toBe("up")
    expect(data.components.aiEngine.status).toBe("down")
  })

  it("responde HTTP 200 con AI 'disabled' cuando AI_ENGINE_ENABLED está desactivado", async () => {
    process.env.AI_ENGINE_ENABLED = "false"
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }])

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("ok")
    expect(data.components.aiEngine.enabled).toBe(false)
    expect(data.components.aiEngine.status).toBe("disabled")
  })

  it("responde HTTP 503 con status 'down' cuando SQLite no responde", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("SQLite busy timeout"))

    const response = await GET()
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe("down")
    expect(data.components.database.status).toBe("down")
  })
})
