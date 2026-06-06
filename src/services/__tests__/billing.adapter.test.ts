import { describe, it, expect, vi, beforeEach } from "vitest"

// A diferencia de billing.test.ts (que mockea db/actions con spyOn para probar
// el camino básico de procesarPagoPedido), aquí mockeamos Prisma para ejercitar
// la CAPA ADAPTADORA real `db`/`actions` que traduce la nomenclatura del Paper
// (pedido/mesa/estado) al esquema Prisma (order/table/status).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    table: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { db, actions } from "../billing.service"

beforeEach(() => vi.clearAllMocks())

describe("billing.db.pedido.findUnique — traducción de esquema", () => {
  it("devuelve null si el pedido no existe en Prisma", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never)
    const r = await db.pedido.findUnique({ where: { id: "x" } })
    expect(r).toBeNull()
  })

  it("mapea status COMPLETED → estado PAGADO y convierte el Decimal total a number", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-1",
      status: "COMPLETED",
      totalAmount: "45.50", // Decimal llega como string
      tableId: "mesa-2",
    } as never)

    const r = await db.pedido.findUnique({ where: { id: "ord-1" } })

    expect(r).toEqual({
      id: "ord-1",
      estado: "PAGADO",
      total: 45.5,
      mesaId: "mesa-2",
    })
  })

  it("mapea cualquier otro status → estado PENDIENTE_PAGO", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-2",
      status: "PENDING",
      totalAmount: 30,
      tableId: null,
    } as never)

    const r = await db.pedido.findUnique({ where: { id: "ord-2" } })
    expect(r?.estado).toBe("PENDIENTE_PAGO")
  })
})

describe("billing.db mutaciones — traducción inversa", () => {
  it("pedido.update traduce estado PAGADO → status COMPLETED", async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({ id: "ord-1" } as never)

    await db.pedido.update({
      where: { id: "ord-1" },
      data: { estado: "PAGADO", metodoPago: "EFECTIVO" },
    })

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: { status: "COMPLETED" },
    })
  })

  it("pedido.update traduce cualquier otro estado → status CONFIRMED", async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({ id: "ord-1" } as never)

    await db.pedido.update({
      where: { id: "ord-1" },
      data: { estado: "PENDIENTE_PAGO" },
    })

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: { status: "CONFIRMED" },
    })
  })

  it("mesa.update traduce estado LIBRE → status DISPONIBLE", async () => {
    vi.mocked(prisma.table.update).mockResolvedValue({ id: "mesa-2" } as never)

    await db.mesa.update({ where: { id: "mesa-2" }, data: { estado: "LIBRE" } })

    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: "mesa-2" },
      data: { status: "DISPONIBLE" },
    })
  })

  it("mesa.update traduce cualquier otro estado → status OCUPADO", async () => {
    vi.mocked(prisma.table.update).mockResolvedValue({ id: "mesa-2" } as never)

    await db.mesa.update({ where: { id: "mesa-2" }, data: { estado: "OCUPADA" } })

    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: "mesa-2" },
      data: { status: "OCUPADO" },
    })
  })

  it("$transaction delega en prisma.$transaction con el arreglo de queries", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
    const queries = [Promise.resolve(1), Promise.resolve(2)]

    await db.$transaction(queries)

    expect(prisma.$transaction).toHaveBeenCalledWith(queries)
  })
})

describe("billing.actions — despacho físico/digital", () => {
  beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}))

  it("imprimirComprobanteFisico resuelve true", async () => {
    await expect(
      actions.imprimirComprobanteFisico("ord-1", 5.0)
    ).resolves.toBe(true)
  })

  it("enviarReciboDigitalPorEmail resuelve true", async () => {
    await expect(
      actions.enviarReciboDigitalPorEmail("ord-1")
    ).resolves.toBe(true)
  })
})
