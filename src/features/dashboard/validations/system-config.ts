import { z } from "zod"

export const systemConfigSchema = z.object({
  companyName: z
    .string({ required_error: "El nombre comercial es requerido" })
    .min(2, "El nombre comercial debe tener al menos 2 caracteres")
    .max(100, "El nombre comercial no puede exceder los 100 caracteres"),
  
  companyAddress: z
    .string()
    .max(200, "La dirección fiscal no puede exceder los 200 caracteres")
    .nullable()
    .optional()
    .or(z.literal("")),

  companyPhone: z
    .string()
    .regex(/^\+51\s9\d{2}\s\d{3}\s\d{3}$/, {
      message: "El teléfono debe tener un formato celular peruano válido (+51 9XX XXX XXX)",
    })
    .nullable()
    .optional()
    .or(z.literal("")),

  companyRuc: z
    .string()
    .regex(/^(10|15|17|20)\d{9}$/, {
      message: "El RUC debe tener 11 dígitos numéricos y comenzar con 10, 15, 17 o 20",
    })
    .nullable()
    .optional()
    .or(z.literal("")),

  taxRate: z
    .number({ required_error: "El IGV es requerido" })
    .min(0, "La tasa de IGV no puede ser menor al 0%")
    .max(0.30, "La tasa de IGV no puede ser mayor al 30% (0.30)"),

  currency: z.enum(["PEN", "USD", "EUR", "CLP", "COP", "MXN"], {
    errorMap: () => ({ message: "La moneda seleccionada no es compatible" }),
  }),

  timezone: z
    .string({ required_error: "La zona horaria es requerida" })
    .min(1, "La zona horaria es requerida"),
})

export type SystemConfigInput = z.infer<typeof systemConfigSchema>
