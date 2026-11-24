import { describe, it, expect } from "vitest"
import { getNivelSla, getSlaClasses, minutosTranscurridos, SLA_AMBAR_MIN, SLA_ROJO_MIN } from "../sla"

const AHORA = new Date("2026-11-24T13:00:00Z").getTime()
const haceMin = (min: number) => new Date(AHORA - min * 60_000).toISOString()

describe("US-14 — SLA cromático de pedidos", () => {
  it("calcula minutos transcurridos (redondeo hacia abajo, nunca negativo)", () => {
    expect(minutosTranscurridos(haceMin(7.9), AHORA)).toBe(7)
    expect(minutosTranscurridos(new Date(AHORA + 60_000), AHORA)).toBe(0)
    expect(minutosTranscurridos("fecha-invalida", AHORA)).toBe(0)
  })

  it("VERDE por debajo de 10 min", () => {
    expect(getNivelSla("PENDING", haceMin(0), AHORA)).toBe("VERDE")
    expect(getNivelSla("CONFIRMED", haceMin(SLA_AMBAR_MIN - 1), AHORA)).toBe("VERDE")
  })

  it("AMBAR entre 10 y 18 min (ambos inclusive)", () => {
    expect(getNivelSla("PREPARING", haceMin(SLA_AMBAR_MIN), AHORA)).toBe("AMBAR")
    expect(getNivelSla("CONFIRMED", haceMin(SLA_ROJO_MIN), AHORA)).toBe("AMBAR")
  })

  it("ROJO cuando supera 18 min (criterio de aceptación de US-14)", () => {
    expect(getNivelSla("CONFIRMED", haceMin(SLA_ROJO_MIN + 1), AHORA)).toBe("ROJO")
    expect(getNivelSla("PENDING", haceMin(45), AHORA)).toBe("ROJO")
  })

  it("sin SLA para pedidos ya entregados por cocina o cerrados", () => {
    for (const status of ["READY", "SERVED", "COMPLETED", "CANCELLED"]) {
      expect(getNivelSla(status, haceMin(60), AHORA)).toBeNull()
    }
  })

  it("ROJO parpadea; sin nivel no agrega clases", () => {
    expect(getSlaClasses("ROJO").borde).toContain("animate-pulse")
    expect(getSlaClasses("VERDE").borde).toContain("emerald")
    expect(getSlaClasses("AMBAR").insignia).toContain("amber")
    expect(getSlaClasses(null)).toEqual({ borde: "", insignia: "" })
  })
})
