/**
 * US-14 — Alertas cromáticas de SLA en cocina.
 *
 * Criterio de aceptación (Product Backlog, Semana 8):
 *   "Dado un ticket de comanda activo, cuando el tiempo supera 18 min,
 *    entonces el borde parpadea en rojo y suena un bip audible."
 *
 * Semáforo:
 *   - VERDE: menos de 10 min desde que se creó el pedido.
 *   - AMBAR: de 10 a 18 min.
 *   - ROJO:  más de 18 min.
 * Solo aplica a pedidos que la cocina aún no entrega (PENDING, CONFIRMED,
 * PREPARING). Los pedidos READY, SERVED, COMPLETED o CANCELLED no tienen SLA.
 */

export const SLA_AMBAR_MIN = 10
export const SLA_ROJO_MIN = 18

export type NivelSla = "VERDE" | "AMBAR" | "ROJO"

const ESTADOS_CON_SLA = new Set(["PENDING", "CONFIRMED", "PREPARING"])

export function minutosTranscurridos(createdAt: string | Date, ahora: number = Date.now()): number {
  const inicio = new Date(createdAt).getTime()
  if (Number.isNaN(inicio)) return 0
  return Math.max(0, Math.floor((ahora - inicio) / 60_000))
}

/** Devuelve el nivel de SLA del pedido, o null si el estado no lleva SLA. */
export function getNivelSla(
  status: string,
  createdAt: string | Date,
  ahora: number = Date.now(),
): NivelSla | null {
  if (!ESTADOS_CON_SLA.has(status)) return null
  const minutos = minutosTranscurridos(createdAt, ahora)
  if (minutos > SLA_ROJO_MIN) return "ROJO"
  if (minutos >= SLA_AMBAR_MIN) return "AMBAR"
  return "VERDE"
}

/**
 * Clases Tailwind según el nivel. `pulso` va en una capa superpuesta para que
 * en ROJO parpadee solo el contorno, sin atenuar el contenido de la tarjeta.
 */
export function getSlaClasses(nivel: NivelSla | null): { borde: string; insignia: string; pulso: string } {
  switch (nivel) {
    case "VERDE":
      return {
        borde: "border-l-4 border-l-emerald-500",
        insignia: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        pulso: "",
      }
    case "AMBAR":
      return {
        borde: "border-l-4 border-l-amber-500",
        insignia: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        pulso: "",
      }
    case "ROJO":
      return {
        borde: "border-l-4 border-l-red-600",
        insignia: "bg-red-600 text-white border-red-700",
        pulso: "pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-red-500 animate-pulse",
      }
    default:
      return { borde: "", insignia: "", pulso: "" }
  }
}
