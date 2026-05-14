import { z } from "zod"

export const tableStatusSchema = z.enum(['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'FUERA_DE_SERVICIO', 'ESPERANDO'])

export const createTableSchema = z.object({
  number: z.coerce.number().int().positive("El número de mesa debe ser un entero positivo"),
  capacity: z.coerce.number().int().positive("La capacidad debe ser un entero positivo"),
  status: tableStatusSchema.default('DISPONIBLE'),
})

export const updateTableSchema = createTableSchema.partial()

export type CreateTableInput = z.infer<typeof createTableSchema>
export type UpdateTableInput = z.infer<typeof updateTableSchema>
