import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import { findMany, findById, update } from "../product.service"

function makeTx() {
  return {
    product: {
      update: vi.fn().mockResolvedValue({ id: "p1" }),
      findUnique: vi.fn().mockResolvedValue({ id: "p1", name: "Ceviche mixto" }),
    },
    recipe: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    },
  }
}

let tx: ReturnType<typeof makeTx>

beforeEach(() => {
  vi.clearAllMocks()
  tx = makeTx()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))
})

describe("product.service.findMany — construcción de filtros", () => {
  it("sin filtros devuelve solo productos activos", async () => {
    await findMany({})
    expect(vi.mocked(prisma.product.findMany).mock.calls[0][0]?.where).toEqual({ isActive: true })
  })

  it("combina categoría, disponibilidad y búsqueda por nombre/descripción", async () => {
    await findMany({ includeInactive: true, categoryId: "c1", isAvailable: false, search: "ceviche" })
    expect(vi.mocked(prisma.product.findMany).mock.calls[0][0]?.where).toEqual({
      categoryId: "c1",
      isAvailable: false,
      OR: [{ name: { contains: "ceviche" } }, { description: { contains: "ceviche" } }],
    })
  })
})

describe("product.service.findById", () => {
  it("consulta por id con categoría y receta", async () => {
    await findById("p1")
    expect(vi.mocked(prisma.product.findUnique).mock.calls[0][0].where).toEqual({ id: "p1" })
  })
})

describe("product.service.update — camino básico", () => {
  it("rechaza renombrar a un nombre que ya usa otro producto activo", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: "p1", name: "Ceviche", categoryId: "c1" } as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: "p2" } as never)
    await expect(update("p1", { name: " Chicharrón " })).rejects.toThrow("Ya existe otro producto con ese nombre")
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("renombra (recortando) y no toca la receta si no viene en el DTO", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: "p1", name: "Ceviche", categoryId: "c1" } as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null as never)
    await update("p1", { name: " Ceviche mixto ", description: "  " })
    expect(tx.product.update.mock.calls[0][0].data).toEqual({ name: "Ceviche mixto", description: null })
    expect(tx.recipe.deleteMany).not.toHaveBeenCalled()
  })

  it("reemplaza la receta con sus ingredientes", async () => {
    await update("p1", {
      price: 38,
      recipe: { instructions: "Cortar", ingredients: [{ ingredientId: "i1", quantity: 0.3, unit: "kg" }] },
    })
    expect(tx.recipe.deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } })
    const data = tx.recipe.create.mock.calls[0][0].data
    expect(data.servings).toBe(1)
    expect(data.ingredients.create).toEqual([{ ingredientId: "i1", quantity: 0.3, unit: "kg", notes: null }])
  })

  it("elimina la receta cuando recipe es null", async () => {
    await update("p1", { recipe: null })
    expect(tx.recipe.deleteMany).toHaveBeenCalled()
    expect(tx.recipe.create).not.toHaveBeenCalled()
  })
})
