import { z } from "zod"

export const ingredientCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es muy largo'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color debe ser un hex válido').optional(),
})

export type IngredientCategoryInput = z.infer<typeof ingredientCategorySchema>

export const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  unit: z.string().min(1, 'La unidad es requerida'),
  minStock: z.number().nonnegative().default(0),
  currentStock: z.number().nonnegative().default(0),
  categoryId: z.string().min(1, 'La categoría es requerida'),
})

export type IngredientInput = z.infer<typeof ingredientSchema>
