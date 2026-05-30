import { describe, it, expect } from "vitest"
import { createOrderSchema } from "../order"

describe("Pruebas Unitarias de Validación: createOrderSchema", () => {
  it("debe validar correctamente un pedido de MESA válido", () => {
    const validData = {
      tableId: "table-1",
      type: "MESA",
      items: [
        { productId: "prod-1", quantity: 2, notes: "Sin cebolla" }
      ]
    }

    const result = createOrderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe fallar para pedido de MESA si no se proporciona tableId", () => {
    const invalidData = {
      type: "MESA",
      items: [
        { productId: "prod-1", quantity: 2 }
      ]
    }

    const result = createOrderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "tableId")
      expect(issue?.message).toBe("Los pedidos de mesa requieren una mesa asignada")
    }
  })

  it("debe validar correctamente un pedido PARA_LLEVAR con nombre de cliente", () => {
    const validData = {
      type: "PARA_LLEVAR",
      customerName: "Juan Pérez",
      items: [
        { productId: "prod-1", quantity: 1 }
      ]
    }

    const result = createOrderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe fallar para pedido PARA_LLEVAR si no tiene nombre de cliente", () => {
    const invalidData = {
      type: "PARA_LLEVAR",
      items: [
        { productId: "prod-1", quantity: 1 }
      ]
    }

    const result = createOrderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "customerName")
      expect(issue?.message).toBe("Los pedidos para llevar requieren nombre del cliente")
    }
  })

  it("debe validar correctamente un pedido de DELIVERY con todos los campos requeridos", () => {
    const validData = {
      type: "DELIVERY",
      customerName: "Carlos Mendoza",
      customerPhone: "987654321",
      customerAddress: "Av. Larco 123",
      items: [
        { productId: "prod-1", quantity: 1 }
      ]
    }

    const result = createOrderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe fallar para pedido de DELIVERY si falta algún campo obligatorio", () => {
    const invalidData = {
      type: "DELIVERY",
      customerName: "Carlos Mendoza",
      // Faltan teléfono y dirección
      items: [
        { productId: "prod-1", quantity: 1 }
      ]
    }

    const result = createOrderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "customerName")
      expect(issue?.message).toBe("Los pedidos de delivery requieren nombre, teléfono y dirección")
    }
  })

  it("debe fallar si el pedido no contiene ningún item", () => {
    const invalidData = {
      tableId: "table-1",
      type: "MESA",
      items: []
    }

    const result = createOrderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "items")
      expect(issue?.message).toBe("El pedido debe tener al menos un item")
    }
  })
})
