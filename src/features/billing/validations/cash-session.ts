import { z } from "zod"

/** US-10 — Apertura de turno de caja. */
export const openCashSessionSchema = z.object({
  openingAmount: z
    .number({ error: "El fondo inicial debe ser un número" })
    .min(0, "El fondo inicial no puede ser negativo")
    .max(100_000, "El fondo inicial excede el máximo permitido"),
})

/** US-10 — Arqueo ciego: el cajero declara el efectivo contado. */
export const closeCashSessionSchema = z.object({
  declaredAmount: z
    .number({ error: "El efectivo contado debe ser un número" })
    .min(0, "El efectivo contado no puede ser negativo")
    .max(1_000_000, "El efectivo contado excede el máximo permitido"),
  notes: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
})

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>
