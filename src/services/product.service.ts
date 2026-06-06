/**
 * @service product.service.ts
 * Capa de servicios para la gestión de productos del menú.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 */

import { type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface RecipeIngredientDto {
  ingredientId: string
  quantity: number
  unit: string
  notes?: string | null
}

export interface RecipeDto {
  instructions?: string | null
  prepTime?: number | null
  servings?: number | null
  ingredients?: RecipeIngredientDto[] | null
}

export interface CreateProductDto {
  name: string
  description?: string | null
  price: number
  categoryId: string
  isAvailable?: boolean
  recipe?: RecipeDto | null
}

export interface UpdateProductDto {
  name?: string
  description?: string | null
  price?: number
  categoryId?: string
  isAvailable?: boolean
  isActive?: boolean
  recipe?: RecipeDto | null
}

export interface ProductFilters {
  categoryId?: string | null
  isAvailable?: boolean | null
  search?: string | null
  includeInactive?: boolean
}

// ─── Selects reutilizables ───────────────────────────────────────────────────

const productInclude = {
  category: { select: { id: true, name: true } },
  recipe: {
    include: {
      ingredients: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, currentStock: true }
          }
        }
      }
    }
  }
} as const

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve productos basados en filtros.
 */
export async function findMany(filters: ProductFilters) {
  const where: any = {}

  if (!filters.includeInactive) {
    where.isActive = true
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.isAvailable !== undefined && filters.isAvailable !== null) {
    where.isAvailable = filters.isAvailable
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { description: { contains: filters.search } }
    ]
  }

  return prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [
      { category: { name: 'asc' } },
      { name: 'asc' }
    ]
  })
}

/**
 * Busca un producto por ID.
 */
export async function findById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  })
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Crea o reactiva un producto con su receta opcional.
 */
export async function create(dto: CreateProductDto) {
  const name = dto.name.trim()

  // 1. Verificar si existe uno activo
  const existingActive = await prisma.product.findFirst({
    where: { name, categoryId: dto.categoryId, isActive: true }
  })

  if (existingActive) {
    throw new Error(`Ya existe un producto activo con el nombre "${name}" en esta categoría`)
  }

  // 2. Buscar si existe uno inactivo para reactivar
  const inactive = await prisma.product.findFirst({
    where: { name, categoryId: dto.categoryId, isActive: false }
  })

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let product;

    if (inactive) {
      // Reactivar
      product = await tx.product.update({
        where: { id: inactive.id },
        data: {
          description: dto.description?.trim() || null,
          price: dto.price,
          isAvailable: dto.isAvailable ?? true,
          isActive: true,
          updatedAt: new Date()
        }
      })
    } else {
      // Crear nuevo
      product = await tx.product.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          price: dto.price,
          categoryId: dto.categoryId,
          isAvailable: dto.isAvailable ?? true,
          isActive: true,
        }
      })
    }

    // Manejar Receta
    if (dto.recipe) {
      // Limpiar anterior si existe
      await tx.recipe.deleteMany({ where: { productId: product.id } })

      // Crear nueva
      await tx.recipe.create({
        data: {
          productId: product.id,
          instructions: dto.recipe.instructions ?? null,
          prepTime: dto.recipe.prepTime ?? null,
          servings: dto.recipe.servings ?? 1,
          ingredients: {
            create: dto.recipe.ingredients?.map(i => ({
              ingredientId: i.ingredientId,
              quantity: i.quantity,
              unit: i.unit,
              notes: i.notes ?? null
            })) || []
          }
        }
      })
    }

    return tx.product.findUnique({
      where: { id: product.id },
      include: productInclude
    })
  })
}

/**
 * Actualiza un producto y su receta.
 */
export async function update(id: string, dto: UpdateProductDto) {
  // Validar duplicados si se cambia el nombre
  if (dto.name) {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (existing && existing.name !== dto.name.trim()) {
      const duplicate = await prisma.product.findFirst({
        where: { 
          name: dto.name.trim(), 
          categoryId: dto.categoryId || existing.categoryId,
          isActive: true,
          id: { not: id }
        }
      })
      if (duplicate) throw new Error("Ya existe otro producto con ese nombre")
    }
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { recipe, ...productData } = dto

    const product = await tx.product.update({
      where: { id },
      data: {
        ...productData,
        ...(productData.name && { name: productData.name.trim() }),
        ...(productData.description !== undefined && { description: productData.description?.trim() || null }),
      }
    })

    if (recipe !== undefined) {
      await tx.recipe.deleteMany({ where: { productId: id } })
      
      if (recipe) {
        await tx.recipe.create({
          data: {
            productId: id,
            instructions: recipe.instructions ?? null,
            prepTime: recipe.prepTime ?? null,
            servings: recipe.servings ?? 1,
            ingredients: {
              create: recipe.ingredients?.map(i => ({
                ingredientId: i.ingredientId,
                quantity: i.quantity,
                unit: i.unit,
                notes: i.notes ?? null
              })) || []
            }
          }
        })
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: productInclude
    })
  })
}

/**
 * Elimina o desactiva un producto dependiendo de si tiene historial.
 */
export async function remove(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } }
  })

  if (!product) throw new Error("Producto no encontrado")

  if (product._count.orderItems > 0) {
    // Soft delete
    return prisma.product.update({
      where: { id },
      data: { isActive: false, isAvailable: false }
    })
  } else {
    // Hard delete
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.recipe.deleteMany({ where: { productId: id } })
      return tx.product.delete({ where: { id } })
    })
  }
}

/**
 * Alterna disponibilidad.
 */
export async function toggleAvailability(id: string) {
  const current = await prisma.product.findUnique({ where: { id }, select: { isAvailable: true } })
  if (!current) throw new Error("Producto no encontrado")

  return prisma.product.update({
    where: { id },
    data: { isAvailable: !current.isAvailable },
    include: productInclude
  })
}
