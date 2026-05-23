/**
 * @service table.service.ts
 * Capa de servicios para la gestión de mesas.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 */

import { prisma } from "@/lib/prisma"

export type TableStatus = "DISPONIBLE" | "OCUPADA" | "RESERVADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"

export interface CreateTableDto {
  number: number
  capacity: number
  status: TableStatus
}

export interface UpdateTableDto {
  number?: number
  capacity?: number
  status?: TableStatus
  isActive?: boolean
}

/**
 * Devuelve todas las mesas activas.
 */
export async function findAllActive() {
  return prisma.table.findMany({
    where: { isActive: true },
    orderBy: { number: 'asc' }
  })
}

/**
 * Busca una mesa por ID.
 */
export async function findById(id: string) {
  return prisma.table.findUnique({
    where: { id }
  })
}

/**
 * Crea una nueva mesa. Lanza error si ya existe una activa con el mismo número.
 */
export async function create(dto: CreateTableDto) {
  const existing = await prisma.table.findFirst({
    where: { 
      number: dto.number,
      isActive: true
    }
  })

  if (existing) {
    throw new Error(`Ya existe una mesa con el número ${dto.number}`)
  }

  return prisma.table.create({
    data: {
      ...dto,
      isActive: true,
    }
  })
}

/**
 * Actualiza una mesa existente.
 */
export async function update(id: string, dto: UpdateTableDto) {
  return prisma.table.update({
    where: { id },
    data: dto
  })
}

/**
 * Soft-delete de una mesa.
 */
export async function softDelete(id: string) {
  return prisma.table.update({
    where: { id },
    data: { isActive: false }
  })
}
