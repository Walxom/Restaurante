import { describe, it, expect } from "vitest"
import { loginSchema } from "../auth/validations/auth"
import { ingredientCategorySchema, ingredientSchema } from "../inventory/validations/ingredient"
import { createCategorySchema, updateCategorySchema } from "../menu/validations/category"
import { createProductSchema, updateProductSchema } from "../menu/validations/product"
import { createTableSchema, updateTableSchema } from "../tables/validations/table"

/**
 * Esquemas Zod de entrada de las API routes (auth, inventario, menú, mesas).
 * Cada caso valida un camino de aceptación y al menos uno de rechazo.
 */
describe("loginSchema", () => {
  it("acepta credenciales completas", () => {
    expect(loginSchema.safeParse({ username: "jefe", password: "1234" }).success).toBe(true)
  })
  it("rechaza usuario o contraseña vacíos", () => {
    const r = loginSchema.safeParse({ username: "", password: "" })
    expect(r.success).toBe(false)
    expect(r.error?.issues).toHaveLength(2)
  })
})

describe("esquemas de inventario", () => {
  it("categoría: acepta color hex y rechaza color inválido", () => {
    expect(ingredientCategorySchema.safeParse({ name: "Mariscos", color: "#1A2b3C" }).success).toBe(true)
    expect(ingredientCategorySchema.safeParse({ name: "Mariscos", color: "azul" }).success).toBe(false)
  })
  it("categoría: rechaza nombre de más de 50 caracteres", () => {
    expect(ingredientCategorySchema.safeParse({ name: "x".repeat(51) }).success).toBe(false)
  })
  it("ingrediente: aplica stock 0 por defecto y rechaza stock negativo", () => {
    const ok = ingredientSchema.parse({ name: "Pescado", unit: "kg", categoryId: "c1" })
    expect(ok.minStock).toBe(0)
    expect(ok.currentStock).toBe(0)
    expect(ingredientSchema.safeParse({ name: "Pescado", unit: "kg", categoryId: "c1", currentStock: -1 }).success).toBe(false)
  })
})

describe("esquemas de menú", () => {
  it("categoría: requiere nombre al crear, pero es opcional al actualizar", () => {
    expect(createCategorySchema.safeParse({ name: "" }).success).toBe(false)
    expect(updateCategorySchema.safeParse({}).success).toBe(true)
  })

  it("producto: convierte precio string a número y marca disponible por defecto", () => {
    const r = createProductSchema.parse({ name: "Ceviche", price: "35.5", categoryId: "c1" })
    expect(r.price).toBe(35.5)
    expect(r.isAvailable).toBe(true)
  })

  it("producto: rechaza precio no positivo", () => {
    expect(createProductSchema.safeParse({ name: "Ceviche", price: 0, categoryId: "c1" }).success).toBe(false)
  })

  it("producto: valida receta con ingredientes y porciones por defecto", () => {
    const r = createProductSchema.parse({
      name: "Ceviche",
      price: 35,
      categoryId: "c1",
      recipe: { ingredients: [{ ingredientId: "i1", quantity: 0.25, unit: "kg" }] },
    })
    expect(r.recipe?.servings).toBe(1)
    expect(
      createProductSchema.safeParse({
        name: "Ceviche",
        price: 35,
        categoryId: "c1",
        recipe: { ingredients: [{ ingredientId: "i1", quantity: 0, unit: "kg" }] },
      }).success,
    ).toBe(false)
  })

  it("producto: update parcial acepta solo el precio", () => {
    expect(updateProductSchema.safeParse({ price: 40 }).success).toBe(true)
  })
})

describe("esquemas de mesas", () => {
  it("convierte número y capacidad, y asigna estado DISPONIBLE", () => {
    const r = createTableSchema.parse({ number: "5", capacity: "4" })
    expect(r).toEqual({ number: 5, capacity: 4, status: "DISPONIBLE" })
  })
  it("rechaza número no positivo y estado desconocido", () => {
    expect(createTableSchema.safeParse({ number: 0, capacity: 4 }).success).toBe(false)
    expect(updateTableSchema.safeParse({ status: "ROTA" }).success).toBe(false)
  })
})
