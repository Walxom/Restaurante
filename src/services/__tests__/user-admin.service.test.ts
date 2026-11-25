import { describe, it, expect, vi, beforeEach } from "vitest"
import bcrypt from "bcryptjs"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import { UserAdminError, listUsers, updateUser } from "../user-admin.service"

const update = vi.mocked(prisma.user.update)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-mesero" } as never)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update.mockImplementation((async (args: any) => ({ id: args.where.id, ...args.data })) as never)
})

describe("user-admin.service", () => {
  it("lista usuarios sin exponer el hash de la contraseña", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    await listUsers()
    const args = vi.mocked(prisma.user.findMany).mock.calls[0][0]
    expect(args?.select).not.toHaveProperty("password")
    expect(args?.select).toMatchObject({ username: true, role: true, isActive: true })
  })

  it("guarda la contraseña nueva como hash bcrypt y levanta el bloqueo", async () => {
    await updateUser("u-jefe", "u-mesero", { password: "NuevaClave2026" })
    const data = update.mock.calls[0][0].data as Record<string, unknown>
    expect(data.password).not.toBe("NuevaClave2026")
    expect(await bcrypt.compare("NuevaClave2026", data.password as string)).toBe(true)
    expect(data).toMatchObject({ failedLoginAttempts: 0, firstFailedLoginAt: null, lockedUntil: null })
  })

  it("activa o desactiva otra cuenta sin tocar la contraseña", async () => {
    await updateUser("u-jefe", "u-mesero", { isActive: false })
    const data = update.mock.calls[0][0].data as Record<string, unknown>
    expect(data).toEqual({ isActive: false })
  })

  it("impide que el JEFE desactive su propia cuenta", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-jefe" } as never)
    await expect(updateUser("u-jefe", "u-jefe", { isActive: false })).rejects.toMatchObject({
      name: "UserAdminError",
      status: 409,
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("permite al JEFE cambiar su propia contraseña", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-jefe" } as never)
    await updateUser("u-jefe", "u-jefe", { password: "OtraClave99" })
    expect(update).toHaveBeenCalledOnce()
  })

  it("responde 404 si el usuario no existe", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const error = await updateUser("u-jefe", "nadie", { isActive: true }).catch((e) => e)
    expect(error).toBeInstanceOf(UserAdminError)
    expect(error.status).toBe(404)
  })
})
