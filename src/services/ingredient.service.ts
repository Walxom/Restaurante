/**
 * @service ingredient.service.ts
 * Capa de servicios para la gestión de ingredientes/inventario.
 * Centraliza la lógica de negocio que antes vivía dispersa en las API routes.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 * NUNCA importar directamente desde componentes React (solo desde rutas de API o server actions).
 */

import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreateIngredientDto {
  name: string
  unit: string
  currentStock: number
  minStock: number
  categoryId?: string | null
}

export interface UpdateIngredientDto {
  name?: string
  unit?: string
  currentStock?: number
  minStock?: number
  categoryId?: string | null
  isActive?: boolean
}

export interface StockAdjustmentDto {
  ingredientId: string
  adjustment: number
  reason?: string
}

export interface BulkStockAdjustmentDto {
  adjustments: StockAdjustmentDto[]
}

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve todos los ingredientes activos con su categoría.
 */
export async function findAllActive() {
  return prisma.ingredient.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: "asc" },
  })
}

/**
 * Devuelve ingredientes eliminados lógicamente (soft-delete).
 */
export async function findDeleted() {
  return prisma.ingredient.findMany({
    where: { isActive: false },
    include: { category: true },
    orderBy: { name: "asc" },
  })
}

/**
 * Devuelve un ingrediente por su ID, incluyendo categoría y relaciones con productos.
 */
export async function findById(id: string) {
  return prisma.ingredient.findUnique({
    where: { id },
    include: {
      category: true,
      recipeIngredients: {
        include: { recipe: { include: { product: { select: { id: true, name: true, isActive: true } } } } },
      },
    },
  })
}

/**
 * Devuelve estadísticas de inventario: total activos, con stock bajo, sin stock.
 */
export async function getStats() {
  const [total, lowStock, outOfStock] = await Promise.all([
    prisma.ingredient.count({ where: { isActive: true } }),
    prisma.ingredient.count({
      where: { isActive: true, currentStock: { lte: prisma.ingredient.fields.minStock } },
    }),
    prisma.ingredient.count({ where: { isActive: true, currentStock: { lte: 0 } } }),
  ])

  return { total, lowStock, outOfStock }
}

/**
 * Devuelve ingredientes con stock por debajo del mínimo (alertas de inventario).
 */
export async function findLowStock() {
  return prisma.ingredient.findMany({
    where: {
      isActive: true,
      currentStock: { lte: prisma.ingredient.fields.minStock },
    },
    include: { category: true },
    orderBy: { currentStock: "asc" },
  })
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Crea un nuevo ingrediente. Lanza error si ya existe uno activo con el mismo nombre.
 */
export async function create(data: CreateIngredientDto) {
  const existing = await prisma.ingredient.findFirst({
    where: { name: data.name, isActive: true },
  })

  if (existing) {
    throw new Error(`Ya existe un ingrediente activo con el nombre "${data.name}"`)
  }

  return prisma.ingredient.create({
    data: {
      name: data.name,
      unit: data.unit,
      currentStock: data.currentStock,
      minStock: data.minStock,
      categoryId: data.categoryId ?? null,
    },
    include: { category: true },
  })
}

/**
 * Actualiza los campos de un ingrediente existente.
 */
export async function update(id: string, data: UpdateIngredientDto) {
  return prisma.ingredient.update({
    where: { id },
    data,
    include: { category: true },
  })
}

/**
 * Soft-delete: desactiva un ingrediente (isActive = false).
 */
export async function softDelete(id: string) {
  return prisma.ingredient.update({
    where: { id },
    data: { isActive: false },
  })
}

/**
 * Restaura un ingrediente eliminado lógicamente.
 */
export async function restore(id: string) {
  return prisma.ingredient.update({
    where: { id },
    data: { isActive: true },
  })
}

/**
 * Elimina múltiples ingredientes en soft-delete.
 */
export async function bulkSoftDelete(ids: string[]) {
  return prisma.ingredient.updateMany({
    where: { id: { in: ids } },
    data: { isActive: false },
  })
}

/**
 * Ajusta el stock de un ingrediente (puede ser positivo o negativo).
 * Lanza error si el resultado dejaría el stock negativo.
 */
export async function adjustStock(dto: StockAdjustmentDto) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: dto.ingredientId },
  })

  if (!ingredient) {
    throw new Error(`Ingrediente con ID "${dto.ingredientId}" no encontrado`)
  }

  const newStock = ingredient.currentStock + dto.adjustment
  if (newStock < 0) {
    throw new Error(
      `Stock insuficiente. Stock actual: ${ingredient.currentStock}, ajuste solicitado: ${dto.adjustment}`
    )
  }

  return prisma.ingredient.update({
    where: { id: dto.ingredientId },
    data: { currentStock: newStock },
    include: { category: true },
  })
}

/**
 * Ajusta el stock de múltiples ingredientes en una transacción atómica.
 */
export async function bulkAdjustStock(dto: BulkStockAdjustmentDto) {
  return prisma.$transaction(
    dto.adjustments.map((adj) =>
      prisma.ingredient.update({
        where: { id: adj.ingredientId },
        data: { currentStock: { increment: adj.adjustment } },
      })
    )
  )
}
