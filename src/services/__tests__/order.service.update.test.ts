import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    product: { findMany: vi.fn() },
    orderItem: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// La impresión en cocina es I/O de hardware: se reemplaza por un espía.
const printOrderChanges = vi.fn()
vi.mock("../printer/kitchen-printer.service", () => ({ printOrderChanges }))

import { prisma } from "@/lib/prisma"
import { findActive, findAll, findById, search, markAllItemsServed, update } from "../order.service"

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
  vi.mocked(prisma.order.update).mockResolvedValue({ id: "ord-1" } as never)
})

describe("order.service — consultas", () => {
  it("findActive excluye pedidos COMPLETED y CANCELLED", async () => {
    await findActive()
    expect(vi.mocked(prisma.order.findMany).mock.calls[0][0]?.where).toEqual({
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    })
  })

  it("findAll y findById consultan sin filtro y por id", async () => {
    await findAll()
    await findById("ord-1")
    expect(vi.mocked(prisma.order.findMany).mock.calls[0][0]?.where).toBeUndefined()
    expect(vi.mocked(prisma.order.findUnique).mock.calls[0][0].where).toEqual({ id: "ord-1" })
  })

  it("search busca por número de pedido o nombre de cliente", async () => {
    await search("Juan")
    const where = vi.mocked(prisma.order.findMany).mock.calls[0][0]?.where as { OR: unknown[] }
    expect(where.OR).toEqual([
      { orderNumber: { contains: "Juan" } },
      { customerName: { contains: "Juan" } },
    ])
  })

  it("markAllItemsServed marca como SERVED solo los items pendientes", async () => {
    await markAllItemsServed("ord-1")
    expect(prisma.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "ord-1", status: { not: "SERVED" } },
      data: { status: "SERVED" },
    })
  })
})

describe("order.service.update — camino básico", () => {
  const existing = {
    id: "ord-1",
    status: "SERVED",
    orderItems: [{ id: "it-1", productId: "p1", status: "PENDING", product: { name: "Ceviche" } }],
  }

  it("lanza error si el pedido no existe", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never)
    await expect(update("x", { notes: "n" })).rejects.toThrow('Pedido con ID "x" no encontrado')
  })

  it("actualiza solo datos del cliente cuando no se envían items (sin imprimir)", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(existing as never)
    await update("ord-1", { notes: "sin ají", customerName: "Ana", customerDni: "45678912" })
    expect(vi.mocked(prisma.order.update).mock.calls[0][0].data).toEqual({
      notes: "sin ají",
      customerName: "Ana",
      customerDni: "45678912",
    })
    expect(prisma.product.findMany).not.toHaveBeenCalled()
    expect(printOrderChanges).not.toHaveBeenCalled()
  })

  it("lanza error si un item referencia un producto inexistente", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as never)
    await expect(update("ord-1", { items: [{ productId: "p9", quantity: 1 }] })).rejects.toThrow(
      "Producto p9 no encontrado",
    )
  })

  it("recalcula total, edita, elimina y crea items; reabre pedido SERVED e imprime cambios", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: "p1", price: 30 },
      { id: "p2", price: 5 },
    ] as never)
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { id: "it-1", status: "PENDING" },
      { id: "it-2", status: "PENDING" },
      { id: "it-3", status: "SERVED" },
    ] as never)

    await update("ord-1", {
      items: [
        { id: "it-1", productId: "p1", quantity: 2 },
        { id: "item_tmp", productId: "p2", quantity: 3, notes: "helada" },
      ],
    })

    // it-2 se elimina; it-3 ya servido se conserva
    expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["it-2"] } } })
    expect(vi.mocked(prisma.orderItem.update).mock.calls[0][0].data).toMatchObject({
      quantity: 2,
      unitPrice: 30,
      subtotal: 60,
    })
    expect(vi.mocked(prisma.orderItem.createMany).mock.calls[0][0]?.data).toEqual([
      { orderId: "ord-1", productId: "p2", quantity: 3, unitPrice: 5, subtotal: 15, notes: "helada", status: "PENDING" },
    ])
    expect(vi.mocked(prisma.order.update).mock.calls[0][0].data).toEqual({ totalAmount: 75, status: "CONFIRMED" })
    expect(printOrderChanges).toHaveBeenCalledWith("ord-1", existing.orderItems, expect.any(Array))
  })
})
