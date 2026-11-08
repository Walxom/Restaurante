import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    table: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { GET } from "../route"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/dashboard/stats", () => {
  const req = new NextRequest("http://localhost:3000/api/dashboard/stats")

  it("rechaza con 403 si no hay sesión autenticada", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET(req)
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("No autorizado")
  })

  it("rechaza con 403 si el usuario tiene rol MESERO", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u-1", name: "Mesero", role: "MESERO" },
    } as never)

    const response = await GET(req)
    expect(response.status).toBe(403)
  })

  it("retorna 200 con estadísticas agregadas incluyendo MANTENIMIENTO y métricas activas", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u-jefe", name: "Administrador", role: "JEFE" },
    } as never)

    // Simular mesas en la base de datos con estados reales
    vi.mocked(prisma.table.groupBy).mockResolvedValue([
      { status: "DISPONIBLE", _count: { id: 5 } },
      { status: "OCUPADA", _count: { id: 3 } },
      { status: "ESPERANDO", _count: { id: 2 } },
      { status: "MANTENIMIENTO", _count: { id: 1 } },
    ] as never)

    // Pedidos pendientes
    vi.mocked(prisma.order.count)
      .mockResolvedValueOnce(4) // pedidosPendientes
      .mockResolvedValueOnce(6) // pedidosServidos

    // activeOrders y totalSales agregados
    vi.mocked(prisma.order.aggregate)
      .mockResolvedValueOnce({
        _sum: { totalAmount: 320.5 },
        _count: { id: 8 },
      } as never) // ventasPedidosServidos
      .mockResolvedValueOnce({
        _sum: { totalAmount: 185.0 },
        _count: { id: 4 },
      } as never) // activeOrdersAgg

    // Facturas de hoy
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({
      _sum: { total: 400.0 },
      _count: { id: 10 },
    } as never)

    // Productos activos y total mesas
    vi.mocked(prisma.product.count).mockResolvedValue(25)
    vi.mocked(prisma.table.count).mockResolvedValue(11)

    // Stock bajo SQL Raw
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: 2 }] as never)

    const response = await GET(req)
    expect(response.status).toBe(200)

    const data = await response.json()

    // 1. Estados de mesa válidos
    expect(data.mesas).toEqual({
      DISPONIBLE: 5,
      OCUPADA: 3,
      ESPERANDO: 2,
      MANTENIMIENTO: 1,
    })
    expect(data.mesas.POR_LIMPIAR).toBeUndefined()
    expect(data.mesas.FUERA_DE_SERVICIO).toBeUndefined()

    // 2. Métricas de pedidos activos calculadas por el backend
    expect(data.activeOrders).toBe(4)
    expect(data.totalSales).toBe(185.0)

    // 3. Ventas de hoy
    expect(data.ventasHoy.total).toBe(400.0)
    expect(data.stockBajo).toBe(2)
    expect(data.productosActivos).toBe(25)
    expect(data.totalMesas).toBe(11)
  })
})
