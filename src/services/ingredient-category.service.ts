/**
 * @service ingredient-category.service.ts
 * Capa de servicios para la gestión de categorías de ingredientes (Inventario).
 */

import { prisma } from "@/lib/prisma"

export interface CreateIngredientCategoryDto {
  name: string
  description?: string | null
}

/**
 * Devuelve todas las categorías de ingredientes.
 */
export async function findAll(includeInactive = false) {
  return prisma.ingredientCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      _count: {
        select: {
          ingredients: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea una nueva categoría de ingredientes.
 */
export async function create(dto: CreateIngredientCategoryDto) {
  const existing = await prisma.ingredientCategory.findUnique({
    where: { name: dto.name }
  })

  if (existing) {
    throw new Error(`Ya existe una categoría con el nombre "${dto.name}"`)
  }

  return prisma.ingredientCategory.create({
    data: {
      ...dto,
      isActive: true
    },
    include: {
      _count: {
        select: {
          ingredients: {
            where: { isActive: true }
          }
        }
      }
    }
  })
}

/**
 * Actualiza una categoría.
 */
export async function update(id: string, dto: any) {
  return prisma.ingredientCategory.update({
    where: { id },
    data: dto
  })
}
