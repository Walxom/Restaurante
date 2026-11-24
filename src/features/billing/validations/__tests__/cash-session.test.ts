import { describe, it, expect } from "vitest"
import { closeCashSessionSchema, openCashSessionSchema } from "../cash-session"

describe("US-10 — validación de apertura y arqueo de caja", () => {
  it("acepta un fondo inicial de 0 o más", () => {
    expect(openCashSessionSchema.safeParse({ openingAmount: 0 }).success).toBe(true)
    expect(openCashSessionSchema.safeParse({ openingAmount: 200.5 }).success).toBe(true)
  })

  it("rechaza fondo negativo, excesivo o no numérico", () => {
    expect(openCashSessionSchema.safeParse({ openingAmount: -1 }).success).toBe(false)
    expect(openCashSessionSchema.safeParse({ openingAmount: 100_001 }).success).toBe(false)
    expect(openCashSessionSchema.safeParse({ openingAmount: "100" }).success).toBe(false)
  })

  it("acepta el efectivo declarado con nota opcional (se recorta)", () => {
    const r = closeCashSessionSchema.safeParse({ declaredAmount: 345, notes: "  faltan monedas  " })
    expect(r.success && r.data.notes).toBe("faltan monedas")
    expect(closeCashSessionSchema.safeParse({ declaredAmount: 0 }).success).toBe(true)
  })

  it("rechaza efectivo negativo y notas de más de 300 caracteres", () => {
    expect(closeCashSessionSchema.safeParse({ declaredAmount: -5 }).success).toBe(false)
    expect(closeCashSessionSchema.safeParse({ declaredAmount: 10, notes: "x".repeat(301) }).success).toBe(false)
  })
})
