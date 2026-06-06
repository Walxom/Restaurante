import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    product: { findMany: vi.fn() },
    table: { update: vi.fn() },
    orderItem: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { create, updateStatus, cancel } from "../order.service"

beforeEach(() => vi.clearAllMocks())

/**
 * updateStatus — camino básico (caja blanca):
 *   Camino 1: pedido inexistente → error.
 *   Camino 2: pedido en estado terminal (COMPLETED/CANCELLED) → error.
 *   Camino 3: transición válida → update.
 */
describe("order.service.updateStatus — camino básico (McCabe)", () => {
  it("Camino 1: lanza error si el pedido no existe", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never)

    await expect(updateStatus("no-existe", "CONFIRMED")).rejects.toThrow(
      'Pedido con ID "no-existe" no encontrado'
    )
    expect(prisma.order.update).not.toHaveBeenCalled()
  })

  it("Camino 2: no permite cambiar el estado de un pedido COMPLETED", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-1",
      status: "COMPLETED",
    } as never)

    await expect(updateStatus("ord-1", "CONFIRMED")).rejects.toThrow(
      "No se puede cambiar el estado de un pedido COMPLETED"
    )
    expect(prisma.order.update).not.toHaveBeenCalled()
  })

  it("Camino 3: aplica la transición válida PENDING → CONFIRMED", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-1",
      status: "PENDING",
    } as never)
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: "ord-1",
      status: "CONFIRMED",
    } as never)

    await updateStatus("ord-1", "CONFIRMED")

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-1" },
        data: { status: "CONFIRMED" },
      })
    )
  })
})

describe("order.service.cancel", () => {
  it("lanza error si el pedido no existe", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never)
    await expect(cancel("x")).rejects.toThrow('Pedido con ID "x" no encontrado')
  })

  it("lanza error si el pedido ya está CANCELLED", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-1",
      status: "CANCELLED",
      tableId: null,
    } as never)
    await expect(cancel("ord-1")).rejects.toThrow("El pedido ya está CANCELLED")
  })

  it("cancela y LIBERA la mesa cuando el pedido tiene mesa asignada", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-1",
      status: "PENDING",
      tableId: "mesa-3",
      table: { id: "mesa-3" },
    } as never)

    const tx = {
      order: { update: vi.fn().mockResolvedValue({ id: "ord-1", status: "CANCELLED" }) },
      table: { update: vi.fn().mockResolvedValue({ id: "mesa-3" }) },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))

    await cancel("ord-1")

    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } })
    )
    expect(tx.table.update).toHaveBeenCalledWith({
      where: { id: "mesa-3" },
      data: { status: "DISPONIBLE" },
    })
  })

  it("cancela SIN tocar mesas cuando el pedido no tiene mesa (delivery/llevar)", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-2",
      status: "CONFIRMED",
      tableId: null,
      table: null,
    } as never)

    const tx = {
      order: { update: vi.fn().mockResolvedValue({ id: "ord-2", status: "CANCELLED" }) },
      table: { update: vi.fn() },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))

    await cancel("ord-2")

    expect(tx.order.update).toHaveBeenCalled()
    expect(tx.table.update).not.toHaveBeenCalled()
  })
})

describe("order.service.create", () => {
  it("lanza error si algún producto no está disponible/activo", async () => {
    // Se piden 2 productos pero solo 1 está disponible
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: "p1", price: 20 },
    ] as never)

    await expect(
      create({
        type: "MESA",
        userId: "u1",
        items: [
          { productId: "p1", quantity: 1 },
          { productId: "p2", quantity: 1 },
        ],
      })
    ).rejects.toThrow("Uno o más productos no están disponibles")
  })

  it("calcula totalAmount = Σ(precio × cantidad) y genera orderNumber con correlativo", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: "p1", price: 20 }, // 20 × 2 = 40
      { id: "p2", price: 15 }, // 15 × 1 = 15  → total 55
    ] as never)
    vi.mocked(prisma.order.count).mockResolvedValue(4 as never)
    vi.mocked(prisma.order.create).mockResolvedValue({ id: "ord-new" } as never)

    await create({
      type: "MESA",
      userId: "u1",
      tableId: "mesa-1",
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
    })

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 55,
          status: "PENDING",
          orderNumber: expect.stringMatching(/^PED-\d{8}-005$/), // count 4 + 1 = 005
        }),
      })
    )
  })
})
