import { z } from "zod"

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "ID de ingrediente requerido"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unit: z.string().min(1, "La unidad es requerida"),
  notes: z.string().optional(),
})

export const recipeSchema = z.object({
  instructions: z.string().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  servings: z.number().int().positive().default(1),
  ingredients: z.array(recipeIngredientSchema).optional(),
})

export const createProductSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  isAvailable: z.boolean().default(true),
  recipe: recipeSchema.optional(),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
