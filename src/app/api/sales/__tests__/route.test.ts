/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    orderItem: {
      groupBy: vi.fn(),
    },
    invoice: {
      groupBy: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { GET } from "../route"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.orderItem.groupBy).mockResolvedValue([])
  vi.mocked(prisma.order.groupBy).mockResolvedValue([])
  vi.mocked(prisma.invoice.groupBy).mockResolvedValue([])
  vi.mocked(prisma.product.findMany).mockResolvedValue([])
  vi.mocked(prisma.user.findMany).mockResolvedValue([])
})

describe("GET /api/sales", () => {
  it("rechaza con 401 si no hay sesión activa", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3001/api/sales")
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("No autorizado")
  })

  it("rechaza con 403 si el rol no es JEFE o ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "MESERO", name: "Mozo 1" },
      expires: "2099-01-01",
    })

    const req = new NextRequest("http://localhost:3001/api/sales")
    const res = await GET(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe("Sin permisos")
  })

  it("retorna ventas y métricas para el rol JEFE con filtro de período", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "JEFE", name: "Jefe Admin" },
      expires: "2099-01-01",
    })

    const mockOrders = [
      {
        id: "ord-1",
        orderNumber: "PED-001",
        totalAmount: 50.0,
        createdAt: new Date("2026-11-08T12:00:00Z"),
        status: "COMPLETED",
        table: { number: 4 },
        user: { name: "Mozo", username: "mesero" },
        orderItems: [
          {
            quantity: 2,
            product: { name: "Ceviche Clásico", price: 25.0 },
          },
        ],
      },
    ]

    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce(mockOrders as any)
      .mockResolvedValueOnce(mockOrders as any)
    vi.mocked(prisma.order.count).mockResolvedValue(1)

    const req = new NextRequest("http://localhost:3001/api/sales?filter=week&page=1&limit=10")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sales).toHaveLength(1)
    expect(json.stats.totalSales).toBe(50.0)
    expect(json.stats.completedOrders).toBe(1)
    expect(json.totalPages).toBe(1)
  })

  it("gestiona períodos sin ventas retornando arreglo vacío y métricas en cero", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "JEFE", name: "Jefe Admin" },
      expires: "2099-01-01",
    })

    vi.mocked(prisma.order.findMany).mockResolvedValue([])
    vi.mocked(prisma.order.count)
      .mockResolvedValueOnce(0) // totalOrders
      .mockResolvedValueOnce(0) // completedOrders
      .mockResolvedValueOnce(0) // cancelledOrders
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { totalAmount: null },
      _avg: { totalAmount: null },
    } as any)

    const req = new NextRequest("http://localhost:3001/api/sales?filter=day&page=1&limit=10")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sales).toEqual([])
    expect(json.stats.totalSales).toBe(0)
    expect(json.stats.completedOrders).toBe(0)
    expect(json.totalPages).toBe(0)
  })
})
