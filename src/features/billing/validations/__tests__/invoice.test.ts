import { describe, it, expect } from "vitest"
import { createInvoiceSchema } from "../invoice"

const base = {
  orderId: "ord-1",
  type: "BOLETA" as const,
  paymentMethod: "YAPE" as const,
  amountPaid: 45.5,
}

describe("createInvoiceSchema", () => {
  it("acepta una boleta válida y aplica autoPrint=false por defecto", () => {
    const r = createInvoiceSchema.parse(base)
    expect(r.autoPrint).toBe(false)
  })

  it("rechaza monto pagado no positivo", () => {
    expect(createInvoiceSchema.safeParse({ ...base, amountPaid: 0 }).success).toBe(false)
  })

  it("rechaza método de pago fuera del catálogo", () => {
    expect(createInvoiceSchema.safeParse({ ...base, paymentMethod: "BITCOIN" }).success).toBe(false)
  })

  it("exige RUC de 11 dígitos para facturas", () => {
    const r = createInvoiceSchema.safeParse({ ...base, type: "FACTURA", customerRuc: "123" })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(["customerRuc"])
  })

  it("acepta factura con RUC de 11 dígitos", () => {
    const r = createInvoiceSchema.safeParse({ ...base, type: "FACTURA", customerRuc: "20100070971" })
    expect(r.success).toBe(true)
  })
})
