import { describe, it, expect } from "vitest"
import { passwordSchema, updateUserSchema } from "../user-admin"

describe("validaciones de administración de usuarios", () => {
  it("acepta una contraseña de 8+ caracteres con letras y números", () => {
    expect(passwordSchema.safeParse("Clave2026").success).toBe(true)
  })

  it.each([
    ["corta", "Ab1", "al menos 8"],
    ["sin números", "SoloLetras", "un número"],
    ["sin letras", "12345678", "una letra"],
    ["más de 72", `a1${"x".repeat(71)}`, "72"],
  ])("rechaza una contraseña %s", (_caso, valor, mensaje) => {
    const r = passwordSchema.safeParse(valor)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain(mensaje)
  })

  it("exige al menos un cambio", () => {
    const r = updateUserSchema.safeParse({})
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain("Indique")
  })

  it("acepta solo el cambio de estado", () => {
    expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true)
  })

  it("rechaza un estado que no sea booleano", () => {
    expect(updateUserSchema.safeParse({ isActive: "no" }).success).toBe(false)
  })
})
