import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { getSystemConfig, getCompanyName, invalidateConfigCache } from "../system.service"

const findFirst = prisma.systemConfig.findFirst as unknown as ReturnType<typeof vi.fn>
const create = prisma.systemConfig.create as unknown as ReturnType<typeof vi.fn>

const stored = {
  id: "cfg",
  companyName: "Fondo Marino",
  companyAddress: "Huanchaco",
  companyPhone: "+51 999 999 999",
  companyRuc: "20100070971",
  taxRate: 0.18,
  currency: "PEN",
  timezone: "America/Lima",
  lastBoletaNumber: 10,
  lastFacturaNumber: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateConfigCache()
})

describe("getSystemConfig", () => {
  it("lee la configuración y la guarda en caché (una sola consulta)", async () => {
    findFirst.mockResolvedValue(stored)
    expect(await getSystemConfig()).toEqual(stored)
    expect(await getCompanyName()).toBe("Fondo Marino")
    expect(findFirst).toHaveBeenCalledTimes(1)
  })

  it("vuelve a consultar después de invalidar la caché", async () => {
    findFirst.mockResolvedValue(stored)
    await getSystemConfig()
    invalidateConfigCache()
    await getSystemConfig()
    expect(findFirst).toHaveBeenCalledTimes(2)
  })

  it("crea la configuración por defecto si no existe (IGV 18 %, PEN)", async () => {
    findFirst.mockResolvedValue(null)
    create.mockImplementation(async ({ data }) => ({ id: "new", ...data }))
    const cfg = await getSystemConfig()
    expect(create).toHaveBeenCalledTimes(1)
    expect(cfg.taxRate).toBe(0.18)
    expect(cfg.currency).toBe("PEN")
  })

  it("devuelve valores por defecto si la base de datos falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    findFirst.mockRejectedValue(new Error("SQLITE_BUSY"))
    const cfg = await getSystemConfig()
    expect(cfg.id).toBe("default")
    expect(cfg.timezone).toBe("America/Lima")
  })
})
