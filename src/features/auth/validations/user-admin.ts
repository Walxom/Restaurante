import { z } from "zod"

/** Contraseña nueva: 8-72 caracteres (72 es el límite de bcrypt), con letras y números. */
export const passwordSchema = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra")
  .regex(/\d/, "La contraseña debe incluir al menos un número")

/** PATCH /api/users/[id] — el JEFE cambia la contraseña o activa/desactiva una cuenta. */
export const updateUserSchema = z
  .object({
    password: passwordSchema.optional(),
    isActive: z.boolean({ error: "isActive debe ser verdadero o falso" }).optional(),
  })
  .refine((d) => d.password !== undefined || d.isActive !== undefined, {
    message: "Indique una contraseña nueva o el estado de la cuenta",
  })

export type UpdateUserInput = z.infer<typeof updateUserSchema>
