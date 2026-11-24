import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cashSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: { groupBy: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { close, findHistory, findOpen, open, resultadoArqueo, CashSessionError } from "../cash-session.service"

const abierta = {
  id: "cs-1",
  status: "ABIERTA",
  openingAmount: 100,
  openedAt: new Date("2026-11-24T08:00:00Z"),
  openedById: "u-jefe",
  openedBy: { id: "u-jefe", name: "Jefe" },
}

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
  // El update devuelve lo que recibe para poder verificar el reporte.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.cashSession.update).mockImplementation((async (args: any) => ({
    ...abierta,
    ...args.data,
    closedBy: { id: "u-jefe", name: "Jefe" },
  })) as never)
})

describe("US-10 — apertura de caja", () => {
  it("abre un turno con el fondo inicial redondeado a céntimos", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.cashSession.create).mockResolvedValue({ id: "cs-2" } as never)
    await open("u-jefe", 150.456)
    expect(prisma.cashSession.create).toHaveBeenCalledWith({
      data: { openingAmount: 150.46, openedById: "u-jefe" },
    })
  })

  it("rechaza abrir un segundo turno si ya hay uno abierto (409)", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(abierta as never)
    const error = await open("u-jefe", 50).catch((e) => e)
    expect(error).toBeInstanceOf(CashSessionError)
    expect(error.status).toBe(409)
    expect(prisma.cashSession.create).not.toHaveBeenCalled()
  })
})

describe("US-10 — vista ciega del turno abierto", () => {
  it("no expone ventas ni monto esperado mientras el turno está abierto", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(abierta as never)
    const vista = await findOpen()
    expect(vista).toEqual({
      id: "cs-1",
      status: "ABIERTA",
      openingAmount: 100,
      openedAt: abierta.openedAt,
      openedBy: abierta.openedBy,
    })
    expect(vista).not.toHaveProperty("expectedAmount")
    expect(vista).not.toHaveProperty("cashSales")
  })

  it("devuelve null si no hay turno abierto", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(null)
    expect(await findOpen()).toBeNull()
  })
})

describe("US-10 — arqueo ciego al cierre", () => {
  it("calcula esperado = fondo + ventas en efectivo y reporta FALTANTE", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(abierta as never)
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([
      { paymentMethod: "EFECTIVO", _sum: { total: 250.5 }, _count: { _all: 4 } },
      { paymentMethod: "YAPE", _sum: { total: 80 }, _count: { _all: 2 } },
      { paymentMethod: "TARJETA", _sum: { total: 45.25 }, _count: { _all: 1 } },
    ] as never)

    const reporte = await close("u-jefe", 345, "  faltan monedas ")

    // Solo comprobantes emitidos (no anulados) dentro del turno
    const where = vi.mocked(prisma.invoice.groupBy).mock.calls[0][0].where as {
      status: string
      issuedAt: { gte: Date }
    }
    expect(where.status).toBe("ISSUED")
    expect(where.issuedAt.gte).toEqual(abierta.openedAt)

    // 100 + 250.50 = 350.50 esperado; declarado 345 => faltante de 5.50
    expect(reporte.expectedAmount).toBe(350.5)
    expect(reporte.cashSales).toBe(250.5)
    expect(reporte.otherSales).toBe(125.25)
    expect(reporte.invoiceCount).toBe(7)
    expect(reporte.difference).toBe(-5.5)
    expect(reporte.resultado).toBe("FALTANTE")
    expect(reporte.porMetodo).toHaveLength(3)
    expect(vi.mocked(prisma.cashSession.update).mock.calls[0][0].data).toMatchObject({
      status: "CERRADA",
      closedById: "u-jefe",
      declaredAmount: 345,
      notes: "  faltan monedas ",
    })
  })

  it("turno sin ventas: esperado = fondo inicial y resultado CUADRADO", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(abierta as never)
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([] as never)
    const reporte = await close("u-jefe", 100)
    expect(reporte.expectedAmount).toBe(100)
    expect(reporte.difference).toBe(0)
    expect(reporte.resultado).toBe("CUADRADO")
    expect(reporte.invoiceCount).toBe(0)
    expect(vi.mocked(prisma.cashSession.update).mock.calls[0][0].data).toMatchObject({ notes: null })
  })

  it("trata un total nulo como 0 y reporta SOBRANTE", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(abierta as never)
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([
      { paymentMethod: "EFECTIVO", _sum: { total: null }, _count: { _all: 0 } },
    ] as never)
    const reporte = await close("u-jefe", 120)
    expect(reporte.expectedAmount).toBe(100)
    expect(reporte.resultado).toBe("SOBRANTE")
  })

  it("falla con 404 si no hay turno abierto", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(null)
    const error = await close("u-jefe", 10).catch((e) => e)
    expect(error).toBeInstanceOf(CashSessionError)
    expect(error.status).toBe(404)
  })
})

describe("US-10 — historial de arqueos", () => {
  it("lista turnos cerrados, más recientes primero, con límite acotado", async () => {
    vi.mocked(prisma.cashSession.findMany).mockResolvedValue([
      {
        ...abierta,
        status: "CERRADA",
        closedAt: new Date(),
        closedBy: null,
        declaredAmount: 90,
        expectedAmount: 100,
        difference: -10,
        cashSales: 0,
        otherSales: null,
        invoiceCount: null,
        notes: null,
      },
    ] as never)
    const historial = await findHistory(500)
    const args = vi.mocked(prisma.cashSession.findMany).mock.calls[0][0]
    expect(args?.take).toBe(50)
    expect(args?.orderBy).toEqual({ closedAt: "desc" })
    expect(historial[0]).toMatchObject({ difference: -10, resultado: "FALTANTE", otherSales: 0, invoiceCount: 0 })

    await findHistory(0)
    expect(vi.mocked(prisma.cashSession.findMany).mock.calls[1][0]?.take).toBe(1)
  })

  it("clasifica la diferencia con tolerancia de medio céntimo", () => {
    expect(resultadoArqueo(0.004)).toBe("CUADRADO")
    expect(resultadoArqueo(0.01)).toBe("SOBRANTE")
    expect(resultadoArqueo(-0.01)).toBe("FALTANTE")
  })
})
