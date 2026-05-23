/**
 * @service category.service.ts
 * Capa de servicios para la gestión de categorías del menú.
 */

import { prisma } from "@/lib/prisma"

export interface CreateCategoryDto {
  name: string
  description?: string | null
  isActive?: boolean
}

/**
 * Devuelve todas las categorías basadas en si se incluyen inactivas.
 */
export async function findAll(includeInactive = false) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      _count: {
        select: { products: { where: { isActive: true } } }
      }
    },
    orderBy: { name: 'asc' }
  })
}

/**
 * Busca una categoría por ID.
 */
export async function findById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        include: { category: { select: { name: true } } }
      }
    }
  })
}

/**
 * Crea una nueva categoría.
 */
export async function create(dto: CreateCategoryDto) {
  const name = dto.name.trim()
  const existing = await prisma.category.findFirst({
    where: { name, isActive: true }
  })

  if (existing) {
    throw new Error(`Ya existe una categoría activa con el nombre "${name}"`)
  }

  return prisma.category.create({
    data: {
      ...dto,
      name,
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? true
    }
  })
}

/**
 * Actualiza una categoría.
 */
export async function update(id: string, dto: any) {
  return prisma.category.update({
    where: { id },
    data: {
      ...dto,
      ...(dto.name && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
    }
  })
}

/**
 * Soft-delete.
 */
export async function softDelete(id: string) {
  return prisma.category.update({
    where: { id },
    data: { isActive: false }
  })
}
