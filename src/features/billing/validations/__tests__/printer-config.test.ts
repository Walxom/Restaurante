import { describe, it, expect } from "vitest"
import { printerConfigSchema } from "../printer-config"

describe("Pruebas Unitarias de Validación: PrinterConfigSchema", () => {
  it("debe validar correctamente una impresora de cocina (red) con IP e IP IPv4 válida", () => {
    const validData = {
      printerId: "kitchen",
      config: {
        name: "Impresora de Cocina",
        enabled: true,
        ip: "192.168.1.150",
        port: 9100,
        timeout: 5000
      }
    }

    const result = printerConfigSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe validar correctamente una impresora fiscal (bluetooth) con puerto COM y baudRate", () => {
    const validData = {
      printerId: "fiscal",
      config: {
        name: "Impresora Fiscal Serie",
        enabled: true,
        port: "COM7",
        baudRate: 115200
      }
    }

    const result = printerConfigSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("debe fallar para impresora de cocina si la IP es inválida", () => {
    const invalidData = {
      printerId: "kitchen",
      config: {
        name: "Cocina",
        enabled: true,
        ip: "abc.def.ghi.jkl",
        port: 9100
      }
    }

    const result = printerConfigSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "config.ip")
      expect(issue?.message).toBe("La dirección IP debe ser un IPv4 válido (ej. 192.168.0.151)")
    }
  })

  it("debe fallar para impresora fiscal si el puerto COM es inválido", () => {
    const invalidData = {
      printerId: "fiscal",
      config: {
        name: "Fiscal",
        enabled: true,
        port: "COMabc"
      }
    }

    const result = printerConfigSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join(".") === "config.port")
      expect(issue?.message).toBe("El formato de puerto COM debe ser válido (ej. COM1, COM7)")
    }
  })
})
