/**
 * Administración de cuentas por el JEFE: listar usuarios, cambiar contraseñas y
 * activar/desactivar cuentas. Permite reemplazar las contraseñas iniciales del seed
 * (admin123 / mesero123) desde el sistema.
 */
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const BCRYPT_COST = 12

export class UserAdminError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "UserAdminError"
  }
}

const userPublico = {
  id: true,
  username: true,
  name: true,
  role: true,
  isActive: true,
  lockedUntil: true,
  updatedAt: true,
} as const

export async function listUsers() {
  return prisma.user.findMany({ select: userPublico, orderBy: [{ role: "asc" }, { username: "asc" }] })
}

/**
 * Aplica los cambios pedidos a la cuenta `id`.
 * - Cambiar la contraseña también levanta un bloqueo por intentos fallidos.
 * - El JEFE no puede desactivar su propia cuenta (se quedaría sin acceso).
 */
export async function updateUser(
  actorId: string,
  id: string,
  cambios: { password?: string; isActive?: boolean }
) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!user) throw new UserAdminError("Usuario no encontrado", 404)
  if (cambios.isActive === false && actorId === id) {
    throw new UserAdminError("No puede desactivar su propia cuenta", 409)
  }

  const data: {
    password?: string
    isActive?: boolean
    failedLoginAttempts?: number
    firstFailedLoginAt?: null
    lockedUntil?: null
  } = {}
  if (cambios.password !== undefined) {
    data.password = await bcrypt.hash(cambios.password, BCRYPT_COST)
    data.failedLoginAttempts = 0
    data.firstFailedLoginAt = null
    data.lockedUntil = null
  }
  if (cambios.isActive !== undefined) data.isActive = cambios.isActive

  return prisma.user.update({ where: { id }, data, select: userPublico })
}
