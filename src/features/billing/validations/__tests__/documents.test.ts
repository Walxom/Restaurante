import { describe, it, expect } from "vitest"
import {
  validateDNI,
  validateRUC,
  validateDocument,
  formatDocument,
  cleanDocument,
} from "../documents"

/**
 * Validación de documentos peruanos (DNI / RUC) usada al emitir boletas y facturas.
 * RUC válido de referencia: 20100070971 (dígito verificador módulo 11 = 1).
 */
describe("validateDNI", () => {
  it("rechaza DNI vacío", () => {
    expect(validateDNI("")).toEqual({ isValid: false, error: "DNI es requerido" })
  })

  it("rechaza DNI con longitud distinta de 8", () => {
    expect(validateDNI("1234567").isValid).toBe(false)
    expect(validateDNI("123456789").error).toMatch(/8 dígitos/)
  })

  it("rechaza DNI con todos los dígitos iguales", () => {
    expect(validateDNI("11111111").error).toMatch(/dígitos iguales/)
  })

  it("acepta DNI válido e ignora caracteres no numéricos", () => {
    expect(validateDNI("4567-8912")).toEqual({ isValid: true, type: "dni" })
  })
})

describe("validateRUC", () => {
  it("rechaza RUC vacío", () => {
    expect(validateRUC("   ").error).toBe("RUC es requerido")
  })

  it("rechaza RUC con longitud distinta de 11", () => {
    expect(validateRUC("2010007097").error).toMatch(/11 dígitos/)
  })

  it("rechaza RUC con todos los dígitos iguales", () => {
    expect(validateRUC("22222222222").error).toMatch(/dígitos iguales/)
  })

  it("rechaza RUC que no empieza con 1 o 2", () => {
    expect(validateRUC("30100070971").error).toMatch(/comenzar con 10 o 20/)
  })

  it("rechaza RUC con dígito verificador inválido", () => {
    expect(validateRUC("20100070970").error).toMatch(/dígito verificador/)
  })

  it("acepta RUC con dígito verificador correcto", () => {
    expect(validateRUC("20100070971")).toEqual({ isValid: true, type: "ruc" })
  })
})

describe("validateDocument", () => {
  it("detecta DNI por longitud 8", () => {
    expect(validateDocument("45678912").type).toBe("dni")
  })

  it("detecta RUC por longitud 11", () => {
    expect(validateDocument("20100070971").type).toBe("ruc")
  })

  it("rechaza longitudes que no son DNI ni RUC", () => {
    expect(validateDocument("12345").error).toMatch(/8 dígitos \(DNI\) o 11/)
  })
})

describe("formatDocument y cleanDocument", () => {
  it("formatea DNI, RUC y otros quitando separadores", () => {
    expect(formatDocument("4567 8912")).toBe("45678912")
    expect(formatDocument("20-100070971")).toBe("20100070971")
    expect(formatDocument("12-34", "ruc")).toBe("1234")
    expect(formatDocument("123")).toBe("123")
  })

  it("cleanDocument elimina todo carácter no numérico", () => {
    expect(cleanDocument("DNI: 45.678.912")).toBe("45678912")
  })
})
