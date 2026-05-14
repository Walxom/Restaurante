/**
 * @service product.service.ts
 * Capa de servicios para la gestión de productos del menú.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 * NUNCA importar directamente desde componentes React.
 */

import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreateProductDto {
  name: string
  description?: string | null
  price: number
  categoryId: string
}

export interface UpdateProductDto {
  name?: string
  description?: string | null
  price?: number
  categoryId?: string
  isAvailable?: boolean
  isActive?: boolean
}

// ─── Selects reutilizables ───────────────────────────────────────────────────

const productInclude = {
  category: { select: { id: true, name: true } },
} as const

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve todos los productos activos con su categoría.
 */
export async function findAllActive() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: productInclude,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  })
}

/**
 * Devuelve todos los productos disponibles para el menú público.
 */
export async function findAvailable() {
  return prisma.product.findMany({
    where: { isActive: true, isAvailable: true },
    include: productInclude,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  })
}

/**
 * Devuelve productos eliminados (soft-delete).
 */
export async function findDeleted() {
  return prisma.product.findMany({
    where: { isActive: false },
    include: productInclude,
    orderBy: { name: "asc" },
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
 * Crea un nuevo producto. Lanza error si ya existe uno activo con el mismo nombre en la misma categoría.
 */
export async function create(data: CreateProductDto) {
  const existing = await prisma.product.findFirst({
    where: {
      name: data.name,
      categoryId: data.categoryId,
      isActive: true,
    },
  })

  if (existing) {
    throw new Error(`Ya existe un producto activo con el nombre "${data.name}" en esa categoría`)
  }

  return prisma.product.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      categoryId: data.categoryId,
      isAvailable: true,
      isActive: true,
    },
    include: productInclude,
  })
}

/**
 * Actualiza los campos de un producto existente.
 */
export async function update(id: string, data: UpdateProductDto) {
  return prisma.product.update({
    where: { id },
    data,
    include: productInclude,
  })
}

/**
 * Soft-delete de un producto.
 */
export async function softDelete(id: string) {
  return prisma.product.update({
    where: { id },
    data: { isActive: false, isAvailable: false },
  })
}

/**
 * Restaura un producto eliminado.
 */
export async function restore(id: string) {
  return prisma.product.update({
    where: { id },
    data: { isActive: true },
  })
}

/**
 * Alterna la disponibilidad de un producto (para el menú en tiempo real).
 */
export async function toggleAvailability(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw new Error(`Producto con ID "${id}" no encontrado`)

  return prisma.product.update({
    where: { id },
    data: { isAvailable: !product.isAvailable },
    include: productInclude,
  })
}
