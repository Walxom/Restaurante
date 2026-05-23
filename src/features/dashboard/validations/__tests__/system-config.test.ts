import { describe, it, expect } from "vitest"
import { systemConfigSchema } from "../system-config"

describe("Pruebas Unitarias de Validación: SystemConfigSchema", () => {
  it("debe validar correctamente un payload completo y válido", () => {
    const validData = {
      companyName: "Restaurante de Prueba",
      companyAddress: "Av. Larco 456, Lima",
      companyPhone: "+51 987 654 321",
      companyRuc: "20123456789",
      taxRate: 0.18,
      currency: "PEN",
      timezone: "America/Lima"
    }

    const result = systemConfigSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe fallar si el nombre comercial es menor a 2 caracteres", () => {
    const invalidData = {
      companyName: "R",
      taxRate: 0.18,
      currency: "PEN",
      timezone: "America/Lima"
    }

    const result = systemConfigSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path[0] === "companyName")
      expect(issue?.message).toBe("El nombre comercial debe tener al menos 2 caracteres")
    }
  })

  it("debe fallar si el RUC tiene un formato inválido en Perú", () => {
    const invalidData = {
      companyName: "Restaurante",
      companyRuc: "12345678901", // no empieza con 10,15,17,20
      taxRate: 0.18,
      currency: "PEN",
      timezone: "America/Lima"
    }

    const result = systemConfigSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path[0] === "companyRuc")
      expect(issue?.message).toBe("El RUC debe tener 11 dígitos numéricos y comenzar con 10, 15, 17 o 20")
    }
  })

  it("debe fallar si la tasa de IGV está fuera de los límites de negocio (mayor al 30%)", () => {
    const invalidData = {
      companyName: "Restaurante",
      taxRate: 0.35, // 35% es demasiado alto
      currency: "PEN",
      timezone: "America/Lima"
    }

    const result = systemConfigSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path[0] === "taxRate")
      expect(issue?.message).toBe("La tasa de IGV no puede ser mayor al 30% (0.30)")
    }
  })
})
