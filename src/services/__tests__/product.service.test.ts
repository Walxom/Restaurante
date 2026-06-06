import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { create, remove, toggleAvailability } from "../product.service"

beforeEach(() => vi.clearAllMocks())

// Helper: tx con product + recipe para los callbacks de $transaction
function makeTx() {
  return {
    product: {
      create: vi.fn().mockResolvedValue({ id: "prod-new" }),
      update: vi.fn().mockResolvedValue({ id: "prod-reactivado" }),
      delete: vi.fn().mockResolvedValue({ id: "prod-del" }),
      findUnique: vi.fn().mockResolvedValue({ id: "prod-new", name: "Ceviche" }),
    },
    recipe: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: "rec-1" }),
    },
  }
}

describe("product.service.create", () => {
  it("lanza error si ya existe un producto ACTIVO con el mismo nombre en la categoría", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce({
      id: "p1",
      name: "Ceviche",
    } as never)

    await expect(
      create({ name: "Ceviche", price: 30, categoryId: "cat-1" })
    ).rejects.toThrow('Ya existe un producto activo con el nombre "Ceviche"')
  })

  it("crea un producto nuevo CON receta (deleteMany + recipe.create)", async () => {
    vi.mocked(prisma.product.findFirst)
      .mockResolvedValueOnce(null as never) // no activo
      .mockResolvedValueOnce(null as never) // no inactivo

    const tx = makeTx()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))

    await create({
      name: "Ceviche",
      price: 30,
      categoryId: "cat-1",
      recipe: {
        servings: 2,
        ingredients: [{ ingredientId: "ing-1", quantity: 0.5, unit: "kg" }],
      },
    })

    expect(tx.product.create).toHaveBeenCalled()
    expect(tx.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: "prod-new", servings: 2 }),
      })
    )
  })

  it("reactiva un producto INACTIVO existente en vez de crear uno", async () => {
    vi.mocked(prisma.product.findFirst)
      .mockResolvedValueOnce(null as never) // no activo
      .mockResolvedValueOnce({ id: "prod-inactivo" } as never) // inactivo

    const tx = makeTx()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))

    await create({ name: "Ceviche", price: 30, categoryId: "cat-1" })

    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prod-inactivo" } })
    )
    expect(tx.product.create).not.toHaveBeenCalled()
  })
})

describe("product.service.remove", () => {
  it("lanza error si el producto no existe", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null as never)
    await expect(remove("x")).rejects.toThrow("Producto no encontrado")
  })

  it("hace SOFT delete si el producto tiene historial de pedidos", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: "p1",
      _count: { orderItems: 3 },
    } as never)
    vi.mocked(prisma.product.update).mockResolvedValue({ id: "p1" } as never)

    await remove("p1")

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { isActive: false, isAvailable: false },
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("hace HARD delete (recipe + product) si no tiene historial", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: "p1",
      _count: { orderItems: 0 },
    } as never)

    const tx = makeTx()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))

    await remove("p1")

    expect(tx.recipe.deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } })
    expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
  })
})

describe("product.service.toggleAvailability", () => {
  it("lanza error si el producto no existe", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null as never)
    await expect(toggleAvailability("x")).rejects.toThrow("Producto no encontrado")
  })

  it("invierte el valor de isAvailable (true → false)", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      isAvailable: true,
    } as never)
    vi.mocked(prisma.product.update).mockResolvedValue({ id: "p1" } as never)

    await toggleAvailability("p1")

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { isAvailable: false },
      })
    )
  })
})
