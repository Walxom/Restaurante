import { z } from "zod"

export const printerConfigSchema = z.discriminatedUnion("printerId", [
  z.object({
    printerId: z.literal("fiscal"),
    config: z.object({
      name: z
        .string({ required_error: "El nombre es requerido" })
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder los 100 caracteres"),
      enabled: z.boolean({ required_error: "El estado de habilitación es requerido" }),
      port: z
        .string({ required_error: "El puerto COM es requerido" })
        .min(2, "El puerto COM es requerido (ej. COM7)")
        .regex(/^COM\d+$/, "El formato de puerto COM debe ser válido (ej. COM1, COM7)"),
      baudRate: z
        .number({ required_error: "El Baud Rate es requerido" })
        .int()
        .min(9600, "El Baud Rate mínimo es 9600")
        .max(115200, "El Baud Rate máximo es 115200")
        .optional()
        .default(115200),
    }),
  }),
  z.object({
    printerId: z.literal("kitchen"),
    config: z.object({
      name: z
        .string({ required_error: "El nombre es requerido" })
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder los 100 caracteres"),
      enabled: z.boolean({ required_error: "El estado de habilitación es requerido" }),
      ip: z
        .string({ required_error: "La dirección IP es requerida" })
        .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, {
          message: "La dirección IP debe ser un IPv4 válido (ej. 192.168.0.151)",
        }),
      port: z
        .number({ required_error: "El puerto es requerido" })
        .int()
        .min(1, "El puerto mínimo es 1")
        .max(65535, "El puerto máximo es 65535"),
      timeout: z
        .number()
        .int()
        .min(500, "El timeout mínimo es 500ms")
        .max(30000, "El timeout máximo es 30000ms")
        .optional()
        .default(5000),
    }),
  }),
])

export type PrinterConfigInput = z.infer<typeof printerConfigSchema>
