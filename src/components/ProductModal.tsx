"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCompatibleUnits, getUnitLabel } from "@/lib/unitConversions"

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string // Can be Decimal from Prisma
  isAvailable: boolean
  isActive: boolean
  categoryId: string
  category: {
    id: string
    name: string
  }
  recipe?: {
    id: string
    instructions: string | null
    prepTime: number | null
    servings: number
    ingredients: RecipeIngredient[]
  }
}

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  productCount?: number
}

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
}

interface RecipeIngredient {
  id?: string
  ingredientId: string
  quantity: number
  unit: string
  notes?: string
  ingredient?: Ingredient
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  product: Product | null
  categories: Category[]
}

export default function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
  })
  const [recipeData, setRecipeData] = useState({
    hasRecipe: false,
    instructions: "",
    prepTime: "",
    servings: "",
    ingredients: [] as Array<{
      ingredientId: string
      quantity: number
      unit: string
    }>
  })
  
  const [ingredientSearch, setIngredientSearch] = useState("")
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar ingredientes disponibles
  useEffect(() => {
    if (isOpen) {
      fetchIngredients()
    }
  }, [isOpen])

  // Resetear formulario cuando cambia el producto o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || "",
          price: Number(product.price).toString(),
          categoryId: product.categoryId,
          isAvailable: product.isAvailable,
        })
        
        // Cargar datos de receta si existe
        if (product.recipe) {
          setRecipeData({
            hasRecipe: true,
            instructions: product.recipe.instructions || "",
            prepTime: product.recipe.prepTime?.toString() || "",
            servings: product.recipe.servings.toString(),
            ingredients: product.recipe.ingredients.map(ing => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit
            }))
          })
        }
      } else {
        setFormData({
          name: "",
          description: "",
          price: "",
          categoryId: categories.length > 0 ? categories[0].id : "",
          isAvailable: true,
        })
        setRecipeData({
          hasRecipe: false,
          instructions: "",
          prepTime: "",
          servings: "1",
          ingredients: []
        })
      }
      setErrors({})
    }
  }, [isOpen, product, categories])

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setAvailableIngredients(data.ingredients || [])
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    }
  }

  const addRecipeIngredient = () => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        ingredientId: "",
        quantity: 0,
        unit: ""
      }]
    }))
  }

  const removeRecipeIngredient = (index: number) => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          // Si se está cambiando el ingrediente, también actualizar la unidad por defecto
          if (field === 'ingredientId') {
            const selectedIngredient = availableIngredients.find(ing => ing.id === value)
            return { 
              ...ingredient, 
              [field]: value,
              unit: selectedIngredient?.unit || ""
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a 0"
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "La categoría es requerida"
    }

    // Validaciones de receta
    if (recipeData.hasRecipe) {
      if (recipeData.prepTime && parseInt(recipeData.prepTime) < 0) {
        newErrors.prepTime = "El tiempo de preparación no puede ser negativo"
      }

      if (recipeData.ingredients.length === 0) {
        newErrors.ingredients = "Debe agregar al menos un ingrediente"
      }

      // Validar ingredientes de la receta
      recipeData.ingredients.forEach((ingredient, index) => {
        if (!ingredient.ingredientId) {
          newErrors[`ingredient_${index}_id`] = "Selecciona un ingrediente"
        }
        if (!ingredient.quantity || ingredient.quantity <= 0) {
          newErrors[`ingredient_${index}_quantity`] = "La cantidad debe ser mayor a 0"
        }
        if (!ingredient.unit.trim()) {
          newErrors[`ingredient_${index}_unit`] = "La unidad es requerida"
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const url = product 
        ? `/api/products/${product.id}` 
        : "/api/products"
      
      const method = product ? "PATCH" : "POST"
      
      const requestBody: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        isAvailable: formData.isAvailable,
      }

      // Incluir datos de receta si está habilitada
      if (recipeData.hasRecipe) {
        requestBody.recipe = {
          instructions: null,
          prepTime: null,
          servings: 1,
          ingredients: recipeData.ingredients.map(ingredient => ({
            ingredientId: ingredient.ingredientId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: null
          }))
        }
      } else {
        // Si no tiene receta, enviar null para eliminar receta existente
        requestBody.recipe = null
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al guardar el producto" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return
    
    if (!confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al eliminar el producto" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Hamburguesa Clásica, Coca Cola..."
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del producto..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (S/) *
                </label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.categoryId ? "border-red-500" : ""}`}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="isAvailable"
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900">
                Producto disponible
              </label>
            </div>

            {/* Sección de Receta Simplificada */}
            <div className="border-t pt-4">
              <div className="flex items-center mb-4">
                <input
                  id="hasRecipe"
                  type="checkbox"
                  checked={recipeData.hasRecipe}
                  onChange={(e) => {
                    setRecipeData({ ...recipeData, hasRecipe: e.target.checked })
                    if (!e.target.checked) {
                      setIngredientSearch("")
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasRecipe" className="ml-2 block text-sm font-medium text-gray-900">
                  Este producto tiene receta (descuenta ingredientes del inventario)
                </label>
              </div>

              {recipeData.hasRecipe && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  {/* Ingredientes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Ingredientes que se usan en este producto
                      </label>
                      <Button
                        type="button"
                        onClick={addRecipeIngredient}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        + Agregar Ingrediente
                      </Button>
                    </div>

                    {errors.ingredients && (
                      <p className="text-red-500 text-sm mb-2">{errors.ingredients}</p>
                    )}

                    {recipeData.ingredients.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No hay ingredientes agregados</p>
                    ) : (
                      <div className="space-y-3">
                        {recipeData.ingredients.map((ingredient, index) => {
                          const filteredIngredients = availableIngredients.filter(ing => 
                            ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
                          )
                          
                          // Obtener el ingrediente seleccionado para mostrar unidades compatibles
                          const selectedIngredient = availableIngredients.find(ing => ing.id === ingredient.ingredientId)
                          const compatibleUnits = selectedIngredient ? getCompatibleUnits(selectedIngredient.unit) : []
                          
                          return (
                            <div key={index} className="grid grid-cols-12 gap-3 items-start bg-white p-3 rounded border">
                              <div className="col-span-5">
                                <label className="block text-xs text-gray-500 mb-1">Ingrediente</label>
                                <div className="relative">
                                  <Input
                                    type="text"
                                    placeholder="Buscar ingrediente..."
                                    value={ingredientSearch}
                                    onChange={(e) => setIngredientSearch(e.target.value)}
                                    className="text-sm mb-2"
                                  />
                                  <select
                                    value={ingredient.ingredientId}
                                    onChange={(e) => {
                                      updateRecipeIngredient(index, 'ingredientId', e.target.value)
                                      setIngredientSearch("")
                                    }}
                                    className={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors[`ingredient_${index}_id`] ? "border-red-500" : ""}`}
                                  >
                                    <option value="">Seleccionar...</option>
                                    {(ingredientSearch ? filteredIngredients : availableIngredients).map((ing) => (
                                      <option key={ing.id} value={ing.id}>
                                        {ing.name} (Stock: {ing.currentStock} {ing.unit})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {errors[`ingredient_${index}_id`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`ingredient_${index}_id`]}</p>
                                )}
                              </div>

                              <div className="col-span-3">
                                <label className="block text-xs text-gray-500 mb-1">Cantidad a usar</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={ingredient.quantity}
                                  onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className={`text-sm ${errors[`ingredient_${index}_quantity`] ? "border-red-500" : ""}`}
                                />
                                {errors[`ingredient_${index}_quantity`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`ingredient_${index}_quantity`]}</p>
                                )}
                              </div>

                              <div className="col-span-3">
                                <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                                <select
                                  value={ingredient.unit}
                                  onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors[`ingredient_${index}_unit`] ? "border-red-500" : ""}`}
                                  disabled={!selectedIngredient}
                                >
                                  <option value="">Seleccionar unidad...</option>
                                  {compatibleUnits.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {getUnitLabel(unit)} ({unit})
                                    </option>
                                  ))}
                                </select>
                                {selectedIngredient && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Stock base: {selectedIngredient.currentStock} {selectedIngredient.unit}
                                  </p>
                                )}
                                {errors[`ingredient_${index}_unit`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`ingredient_${index}_unit`]}</p>
                                )}
                              </div>

                              <div className="col-span-1">
                                <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                                <Button
                                  type="button"
                                  onClick={() => removeRecipeIngredient(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50 p-1 h-8 w-8"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {product && (
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              )}
              
              <div className="flex-1"></div>
              
              <Button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                variant="outline"
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Guardando..." : product ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
