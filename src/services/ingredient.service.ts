/**
 * @service ingredient.service.ts
 * Capa de servicios para la gestión de ingredientes/inventario.
 * Centraliza la lógica de negocio que antes vivía dispersa en las API routes.
 */

import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreateIngredientDto {
  name: string
  unit: string
  unitCategory?: string | null
  currentStock: number
  minStock: number
  maxStock?: number | null
  cost?: number | null
  categoryId?: string | null
}

export interface UpdateIngredientDto {
  name?: string
  unit?: string
  unitCategory?: string | null
  currentStock?: number
  minStock?: number
  maxStock?: number | null
  cost?: number | null
  categoryId?: string | null
  isActive?: boolean
}

export interface IngredientFilters {
  search?: string | null
  stockFilter?: string | null // 'all', 'low', 'critical', 'ok', 'empty'
  categoryId?: string | null
  minCost?: number | null
  maxCost?: number | null
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula el estado visual y semántico del stock de un ingrediente.
 */
export function calculateStockStatus(currentStock: number, minStock: number) {
  const stockPercentage = minStock > 0 ? (currentStock / minStock) : (currentStock > 0 ? 2 : 0)
  let status = 'ok'
  let statusColor = 'green'
  let statusText = 'Stock OK'

  if (currentStock <= 0) {
    status = 'empty'
    statusColor = 'gray'
    statusText = 'Agotado'
  } else if (stockPercentage <= 0.2) {
    status = 'critical'
    statusColor = 'red'
    statusText = 'Stock Crítico'
  } else if (stockPercentage <= 1) {
    status = 'low'
    statusColor = 'yellow'
    statusText = 'Stock Bajo'
  }

  return {
    status,
    statusColor,
    statusText,
    stockPercentage: Math.round(stockPercentage * 100)
  }
}

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve ingredientes basados en filtros complejos y paginación.
 */
export async function findMany(filters: IngredientFilters) {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    categoryId, 
    minCost, 
    maxCost, 
    stockFilter, 
    sortBy = 'name', 
    sortOrder = 'asc' 
  } = filters
  
  const skip = (page - 1) * limit

  const where: any = { isActive: true }
  
  if (search) {
    where.name = { contains: search }
  }

  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId
  }

  if (minCost !== undefined || maxCost !== undefined) {
    where.cost = {}
    if (minCost !== null && minCost !== undefined) where.cost.gte = minCost
    if (maxCost !== null && maxCost !== undefined) where.cost.lte = maxCost
  }

  // Stock Filter en Prisma (si es posible)
  if (stockFilter === 'empty') {
    where.currentStock = { lte: 0 }
  }

  const orderBy: any = {}
  orderBy[sortBy as string] = sortOrder

  const [ingredients, totalCount] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy,
      skip,
      take: limit
    }),
    prisma.ingredient.count({ where })
  ])

  // Aplicar filtros de stock en memoria si son complejos (relación current/min)
  let resultIngredients = ingredients
  if (stockFilter && !['all', 'empty'].includes(stockFilter)) {
    resultIngredients = ingredients.filter(i => {
      const { status } = calculateStockStatus(i.currentStock, i.minStock)
      return status === stockFilter
    })
  }

  const processed = resultIngredients.map(i => ({
    ...i,
    ...calculateStockStatus(i.currentStock, i.minStock)
  }))

  return {
    ingredients: processed,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
      itemsPerPage: limit
    }
  }
}

/**
 * Busca un ingrediente por ID.
 */
export async function findById(id: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      category: true,
      recipeIngredients: {
        include: { recipe: { include: { product: { select: { id: true, name: true, isActive: true } } } } },
      },
    },
  })

  if (!ingredient) return null

  return {
    ...ingredient,
    ...calculateStockStatus(ingredient.currentStock, ingredient.minStock)
  }
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Crea o reactiva un ingrediente.
 */
export async function create(dto: CreateIngredientDto) {
  const name = dto.name.trim()

  // 1. Verificar si existe uno activo
  const existingActive = await prisma.ingredient.findFirst({
    where: { name, isActive: true }
  })

  if (existingActive) {
    throw new Error(`Ya existe un ingrediente activo con el nombre "${name}"`)
  }

  // 2. Buscar si existe uno inactivo para reactivar
  const inactive = await prisma.ingredient.findFirst({
    where: { name, isActive: false }
  })

  let ingredient;
  if (inactive) {
    ingredient = await prisma.ingredient.update({
      where: { id: inactive.id },
      data: {
        ...dto,
        name,
        isActive: true,
        updatedAt: new Date()
      },
      include: { category: true }
    })
  } else {
    ingredient = await prisma.ingredient.create({
      data: {
        ...dto,
        name,
        isActive: true
      },
      include: { category: true }
    })
  }

  return {
    ...ingredient,
    ...calculateStockStatus(ingredient.currentStock, ingredient.minStock)
  }
}

/**
 * Actualiza un ingrediente.
 */
export async function update(id: string, dto: UpdateIngredientDto) {
  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      ...dto,
      ...(dto.name && { name: dto.name.trim() })
    },
    include: { category: true }
  })

  return {
    ...ingredient,
    ...calculateStockStatus(ingredient.currentStock, ingredient.minStock)
  }
}

/**
 * Elimina o desactiva un ingrediente según su uso en el menú.
 */
export async function remove(id: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      recipeIngredients: {
        include: {
          recipe: {
            include: {
              product: { select: { id: true, name: true, isActive: true } }
            }
          }
        }
      }
    }
  })

  if (!ingredient) throw new Error("Ingrediente no encontrado")

  const activeProducts = ingredient.recipeIngredients.filter(ri => ri.recipe.product.isActive)

  if (activeProducts.length > 0) {
    const names = activeProducts.map(ri => ri.recipe.product.name).join(", ")
    throw new Error(`No se puede eliminar: está en uso en productos activos (${names})`)
  }

  if (ingredient.recipeIngredients.length > 0) {
    // Soft delete if it has history with inactive products
    return prisma.ingredient.update({
      where: { id },
      data: { isActive: false }
    })
  } else {
    // Hard delete if no relations at all
    return prisma.ingredient.delete({ where: { id } })
  }
}
