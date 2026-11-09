import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock del singleton Prisma (mismo patrón que invoice.service.test.ts)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  calculateStockStatus,
  create,
  remove,
  findMany,
} from "../ingredient.service"

beforeEach(() => vi.clearAllMocks())

/**
 * calculateStockStatus es una función PURA. Es el caso ideal para pruebas de
 * camino básico (caja blanca). Complejidad ciclomática V(G):
 *   Nodos predicado: (currentStock<=0), (stockPercentage<=0.2), (stockPercentage<=1)
 *   y el ternario interno (minStock>0) y (currentStock>0) → 5 aristas de decisión.
 *   V(G) = P + 1. Cubrimos los 5 caminos independientes a continuación.
 */
describe("calculateStockStatus — camino básico (McCabe)", () => {
  it("Camino 1: stock agotado (currentStock <= 0) → 'empty'", () => {
    const r = calculateStockStatus(0, 10)
    expect(r.status).toBe("empty")
    expect(r.statusColor).toBe("gray")
  })

  it("Camino 2: stock crítico (ratio <= 0.2) → 'critical'", () => {
    const r = calculateStockStatus(1, 10) // 0.1
    expect(r.status).toBe("critical")
    expect(r.statusColor).toBe("red")
    expect(r.stockPercentage).toBe(10)
  })

  it("Camino 3: stock bajo (0.2 < ratio <= 1) → 'low'", () => {
    const r = calculateStockStatus(8, 10) // 0.8
    expect(r.status).toBe("low")
    expect(r.statusColor).toBe("yellow")
  })

  it("Camino 4: stock suficiente (ratio > 1) → 'ok'", () => {
    const r = calculateStockStatus(50, 10) // 5.0
    expect(r.status).toBe("ok")
    expect(r.statusColor).toBe("green")
  })

  it("Camino 5: minStock = 0 con stock positivo → ratio forzado a 2 → 'ok'", () => {
    const r = calculateStockStatus(5, 0)
    expect(r.status).toBe("ok")
    expect(r.stockPercentage).toBe(200)
  })
})

describe("ingredient.service.create", () => {
  it("lanza error si ya existe un ingrediente ACTIVO con el mismo nombre", async () => {
    vi.mocked(prisma.ingredient.findFirst).mockResolvedValueOnce({
      id: "ing-1",
      name: "Limón",
    } as never)

    await expect(
      create({ name: "Limón", unit: "kg", currentStock: 5, minStock: 2 })
    ).rejects.toThrow('Ya existe un ingrediente activo con el nombre "Limón"')

    expect(prisma.ingredient.create).not.toHaveBeenCalled()
  })

  it("reactiva un ingrediente INACTIVO existente (update) en vez de crear uno nuevo", async () => {
    // 1ra llamada: no hay activo. 2da llamada: existe inactivo.
    vi.mocked(prisma.ingredient.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: "ing-inactivo", name: "Limón" } as never)

    vi.mocked(prisma.ingredient.update).mockResolvedValue({
      id: "ing-inactivo",
      name: "Limón",
      currentStock: 5,
      minStock: 2,
    } as never)

    const result = await create({
      name: "Limón",
      unit: "kg",
      currentStock: 5,
      minStock: 2,
    })

    expect(prisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ing-inactivo" } })
    )
    expect(prisma.ingredient.create).not.toHaveBeenCalled()
    // Enriquecido con el estado de stock calculado
    expect(result.status).toBe("ok")
  })

  it("crea un ingrediente nuevo cuando no hay activo ni inactivo", async () => {
    vi.mocked(prisma.ingredient.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)

    vi.mocked(prisma.ingredient.create).mockResolvedValue({
      id: "ing-nuevo",
      name: "Cebolla",
      currentStock: 1,
      minStock: 10, // ratio 0.1 → critical
    } as never)

    const result = await create({
      name: "  Cebolla  ", // se debe normalizar (trim)
      unit: "kg",
      currentStock: 1,
      minStock: 10,
    })

    expect(prisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Cebolla", isActive: true }),
      })
    )
    expect(result.status).toBe("critical")
  })
})

describe("ingredient.service.remove", () => {
  it("lanza error si el ingrediente no existe", async () => {
    vi.mocked(prisma.ingredient.findUnique).mockResolvedValue(null as never)

    await expect(remove("inexistente")).rejects.toThrow(
      "Ingrediente no encontrado"
    )
  })

  it("lanza error si está en uso por productos ACTIVOS", async () => {
    vi.mocked(prisma.ingredient.findUnique).mockResolvedValue({
      id: "ing-1",
      recipeIngredients: [
        { recipe: { product: { id: "p1", name: "Ceviche", isActive: true } } },
      ],
    } as never)

    await expect(remove("ing-1")).rejects.toThrow(
      "No se puede eliminar: está en uso en productos activos (Ceviche)"
    )
    expect(prisma.ingredient.delete).not.toHaveBeenCalled()
  })

  it("hace soft delete si solo tiene historial con productos INACTIVOS", async () => {
    vi.mocked(prisma.ingredient.findUnique).mockResolvedValue({
      id: "ing-1",
      recipeIngredients: [
        { recipe: { product: { id: "p1", name: "Antiguo", isActive: false } } },
      ],
    } as never)
    vi.mocked(prisma.ingredient.update).mockResolvedValue({ id: "ing-1" } as never)

    await remove("ing-1")

    expect(prisma.ingredient.update).toHaveBeenCalledWith({
      where: { id: "ing-1" },
      data: { isActive: false },
    })
    expect(prisma.ingredient.delete).not.toHaveBeenCalled()
  })

  it("hace hard delete si no tiene ninguna relación", async () => {
    vi.mocked(prisma.ingredient.findUnique).mockResolvedValue({
      id: "ing-1",
      recipeIngredients: [],
    } as never)
    vi.mocked(prisma.ingredient.delete).mockResolvedValue({ id: "ing-1" } as never)

    await remove("ing-1")

    expect(prisma.ingredient.delete).toHaveBeenCalledWith({
      where: { id: "ing-1" },
    })
    expect(prisma.ingredient.update).not.toHaveBeenCalled()
  })
})

describe("ingredient.service.findMany", () => {
  it("pagina correctamente con filtros estándar sin stockFilter complejo", async () => {
    const mockList = [
      { id: "ing-1", name: "Sal", currentStock: 10, minStock: 2, category: null },
      { id: "ing-2", name: "Pimienta", currentStock: 5, minStock: 1, category: null },
    ]
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue(mockList as never)
    vi.mocked(prisma.ingredient.count).mockResolvedValue(2)

    const result = await findMany({ page: 1, limit: 10 })

    expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    )
    expect(result.ingredients).toHaveLength(2)
    expect(result.pagination.totalItems).toBe(2)
    expect(result.pagination.totalPages).toBe(1)
  })

  it("filtra antes de paginar cuando stockFilter es 'critical' para evitar desincronización de páginas", async () => {
    const mockList = [
      { id: "ing-1", name: "Ceviche Mix", currentStock: 1, minStock: 10, category: null }, // ratio 0.1 -> critical
      { id: "ing-2", name: "Arroz", currentStock: 50, minStock: 10, category: null }, // ratio 5 -> ok
      { id: "ing-3", name: "Camarón", currentStock: 1, minStock: 10, category: null }, // ratio 0.1 -> critical
      { id: "ing-4", name: "Pescado", currentStock: 8, minStock: 10, category: null }, // ratio 0.8 -> low
    ]
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue(mockList as never)

    const result = await findMany({ stockFilter: "critical", page: 1, limit: 1 })

    // Solo 2 items son critical
    expect(result.pagination.totalItems).toBe(2)
    expect(result.pagination.totalPages).toBe(2)
    expect(result.ingredients).toHaveLength(1)
    expect(result.ingredients[0].status).toBe("critical")
    expect(result.ingredients[0].name).toBe("Ceviche Mix")
  })
})
