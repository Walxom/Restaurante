import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock del singleton Prisma (mismo patrón que ingredient.service.test.ts)
vi.mock("@/lib/prisma", () => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  })
  return {
    prisma: {
      category: model(),
      ingredientCategory: model(),
      table: model(),
    },
  }
})

import { prisma } from "@/lib/prisma"
import * as categoryService from "../category.service"
import * as ingredientCategoryService from "../ingredient-category.service"
import * as tableService from "../table.service"

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

beforeEach(() => vi.clearAllMocks())

describe("category.service", () => {
  it("findAll filtra solo activas por defecto e incluye inactivas si se pide", async () => {
    await categoryService.findAll()
    expect(db.category.findMany.mock.calls[0][0].where).toEqual({ isActive: true })
    await categoryService.findAll(true)
    expect(db.category.findMany.mock.calls[1][0].where).toEqual({})
  })

  it("findById consulta por id con productos activos", async () => {
    await categoryService.findById("c1")
    expect(db.category.findUnique.mock.calls[0][0].where).toEqual({ id: "c1" })
  })

  it("create rechaza nombre duplicado entre categorías activas", async () => {
    db.category.findFirst.mockResolvedValue({ id: "c1" })
    await expect(categoryService.create({ name: " Bebidas " })).rejects.toThrow(/Bebidas/)
    expect(db.category.create).not.toHaveBeenCalled()
  })

  it("create normaliza nombre/descripción y activa por defecto", async () => {
    db.category.findFirst.mockResolvedValue(null)
    await categoryService.create({ name: " Ceviches ", description: "  " })
    expect(db.category.create.mock.calls[0][0].data).toEqual({
      name: "Ceviches",
      description: null,
      isActive: true,
    })
  })

  it("update recorta nombre y descripción solo si vienen en el DTO", async () => {
    await categoryService.update("c1", { name: " Postres ", description: " dulces " })
    expect(db.category.update.mock.calls[0][0].data).toEqual({ name: "Postres", description: "dulces" })
    await categoryService.update("c1", { isActive: false })
    expect(db.category.update.mock.calls[1][0].data).toEqual({ isActive: false })
  })

  it("softDelete marca isActive=false", async () => {
    await categoryService.softDelete("c1")
    expect(db.category.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { isActive: false } })
  })
})

describe("ingredient-category.service", () => {
  it("findAll respeta el filtro de activas", async () => {
    await ingredientCategoryService.findAll()
    await ingredientCategoryService.findAll(true)
    expect(db.ingredientCategory.findMany.mock.calls[0][0].where).toEqual({ isActive: true })
    expect(db.ingredientCategory.findMany.mock.calls[1][0].where).toEqual({})
  })

  it("create rechaza nombre existente", async () => {
    db.ingredientCategory.findUnique.mockResolvedValue({ id: "x" })
    await expect(ingredientCategoryService.create({ name: "Mariscos" })).rejects.toThrow(/Mariscos/)
  })

  it("create guarda la categoría activa", async () => {
    db.ingredientCategory.findUnique.mockResolvedValue(null)
    await ingredientCategoryService.create({ name: "Verduras" })
    expect(db.ingredientCategory.create.mock.calls[0][0].data).toEqual({ name: "Verduras", isActive: true })
  })

  it("update delega el DTO tal cual", async () => {
    await ingredientCategoryService.update("i1", { name: "Pescados" })
    expect(db.ingredientCategory.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { name: "Pescados" } })
  })
})

describe("table.service", () => {
  it("findAllActive ordena por número", async () => {
    await tableService.findAllActive()
    expect(db.table.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { number: "asc" } })
  })

  it("findById busca por id", async () => {
    await tableService.findById("t1")
    expect(db.table.findUnique).toHaveBeenCalledWith({ where: { id: "t1" } })
  })

  it("create rechaza número de mesa activa repetido", async () => {
    db.table.findFirst.mockResolvedValue({ id: "t1" })
    await expect(tableService.create({ number: 3, capacity: 4, status: "DISPONIBLE" })).rejects.toThrow(/número 3/)
  })

  it("create registra la mesa activa", async () => {
    db.table.findFirst.mockResolvedValue(null)
    await tableService.create({ number: 7, capacity: 2, status: "DISPONIBLE" })
    expect(db.table.create.mock.calls[0][0].data).toEqual({ number: 7, capacity: 2, status: "DISPONIBLE", isActive: true })
  })

  it("update y softDelete actualizan por id", async () => {
    await tableService.update("t1", { status: "OCUPADA" })
    await tableService.softDelete("t1")
    expect(db.table.update.mock.calls[0][0]).toEqual({ where: { id: "t1" }, data: { status: "OCUPADA" } })
    expect(db.table.update.mock.calls[1][0]).toEqual({ where: { id: "t1" }, data: { isActive: false } })
  })
})
