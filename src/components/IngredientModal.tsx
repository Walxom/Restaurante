"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  UNIT_CATEGORIES, 
  getUnitsByCategory, 
  suggestUnitCategory,
  INGREDIENT_TYPE_SUGGESTIONS 
} from "@/lib/ingredientUnits"

interface Ingredient {
  id: string
  name: string
  unit: string
  unitCategory?: string
  currentStock: number
  minStock: number
  maxStock?: number
  cost?: number
  categoryId?: string
  category?: {
    id: string
    name: string
    color: string
  }
  isActive: boolean
}

interface IngredientCategory {
  id: string
  name: string
  description?: string
  color?: string
}

interface IngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ingredient?: Ingredient | null
}

export default function IngredientModal({
  isOpen,
  onClose,
  onSuccess,
  ingredient
}: IngredientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    unitCategory: "",
    currentStock: "",
    minStock: "",
    maxStock: "",
    cost: "",
    categoryId: ""
  })
  const [selectedUnitCategory, setSelectedUnitCategory] = useState<string>("")
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  // Cargar datos del ingrediente si estamos editando
  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        unitCategory: ingredient.unitCategory || "",
        currentStock: ingredient.currentStock.toString(),
        minStock: ingredient.minStock.toString(),
        maxStock: ingredient.maxStock?.toString() || "",
        cost: ingredient.cost?.toString() || "",
        categoryId: ingredient.categoryId || ""
      })
      
      // Usar la categoría guardada o determinar basada en la unidad actual
      const savedCategory = ingredient.unitCategory
      if (savedCategory) {
        setSelectedUnitCategory(savedCategory)
      } else {
        const unitCategory = UNIT_CATEGORIES.find(cat => 
          cat.units.some(unit => unit.value === ingredient.unit)
        )
        setSelectedUnitCategory(unitCategory?.id || "")
      }
    } else {
      setFormData({
        name: "",
        unit: "",
        unitCategory: "",
        currentStock: "",
        minStock: "",
        maxStock: "",
        cost: "",
        categoryId: ""
      })
      setSelectedUnitCategory("")
    }
    setErrors({})
  }, [ingredient, isOpen])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/ingredient-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.unit.trim()) {
      newErrors.unit = "La unidad es requerida"
    }

    if (!formData.currentStock || isNaN(Number(formData.currentStock)) || Number(formData.currentStock) < 0) {
      newErrors.currentStock = "El stock actual debe ser un número positivo"
    }

    if (!formData.minStock || isNaN(Number(formData.minStock)) || Number(formData.minStock) < 0) {
      newErrors.minStock = "El stock mínimo debe ser un número positivo"
    }

    if (formData.maxStock && (isNaN(Number(formData.maxStock)) || Number(formData.maxStock) < Number(formData.minStock))) {
      newErrors.maxStock = "El stock máximo debe ser mayor al stock mínimo"
    }

    if (formData.cost && (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)) {
      newErrors.cost = "El costo debe ser un número positivo"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        unitCategory: formData.unitCategory || null,
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        maxStock: formData.maxStock ? Number(formData.maxStock) : null,
        cost: formData.cost ? Number(formData.cost) : null,
        categoryId: formData.categoryId || null
      }

      const url = ingredient ? `/api/ingredients/${ingredient.id}` : "/api/ingredients"
      const method = ingredient ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        setErrors({ submit: error.error || "Error al guardar el ingrediente" })
      }
    } catch (error) {
      console.error("Error al guardar ingrediente:", error)
      setErrors({ submit: "Error al conectar con el servidor" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Sugerir categoría de unidad automáticamente cuando se cambia el nombre
    if (field === "name" && value.trim() && !selectedUnitCategory) {
      const suggestedCategory = suggestUnitCategory(value)
      setSelectedUnitCategory(suggestedCategory)
      
      // Si hay una sugerencia, seleccionar la primera unidad de esa categoría
      const categoryUnits = getUnitsByCategory(suggestedCategory)
      if (categoryUnits.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          unit: categoryUnits[0].value,
          unitCategory: suggestedCategory
        }))
      }
    }
    
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleUnitCategoryChange = (categoryId: string) => {
    setSelectedUnitCategory(categoryId)
    
    // Seleccionar la primera unidad de la categoría
    const categoryUnits = getUnitsByCategory(categoryId)
    if (categoryUnits.length > 0) {
      setFormData(prev => ({ 
        ...prev, 
        unit: categoryUnits[0].value,
        unitCategory: categoryId
      }))
    }
    
    // Limpiar error de unidad
    if (errors.unit) {
      setErrors(prev => ({ ...prev, unit: "" }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">
            {ingredient ? "Editar Ingrediente" : "Nuevo Ingrediente"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ej: Papas, Pollo, Coca Cola"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría (Opcional)
              </label>
              <Select 
                value={formData.categoryId ? formData.categoryId : "no-category"} 
                onValueChange={(value) => handleInputChange("categoryId", value === "no-category" ? "" : value)}
              >
                <SelectTrigger className={errors.categoryId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-category">Sin categoría</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Ayuda a organizar y filtrar ingredientes
              </p>
            </div>

            {/* Tipo de Unidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Medición *
              </label>
              <Select value={selectedUnitCategory} onValueChange={handleUnitCategoryChange}>
                <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar tipo de medición" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_CATEGORIES.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-gray-500">{category.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Mostrar sugerencias de ingredientes para la categoría seleccionada */}
              {selectedUnitCategory && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Ejemplos para esta categoría:</p>
                  <div className="flex flex-wrap gap-1">
                    {INGREDIENT_TYPE_SUGGESTIONS[selectedUnitCategory as keyof typeof INGREDIENT_TYPE_SUGGESTIONS]
                      ?.slice(0, 6)
                      .map(suggestion => (
                        <Badge key={suggestion} variant="secondary" className="text-xs">
                          {suggestion}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Unidad Específica */}
            {selectedUnitCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad Específica *
                </label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => handleInputChange("unit", value)}
                >
                  <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitsByCategory(selectedUnitCategory).map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-red-500 text-xs mt-1">{errors.unit}</p>
                )}
              </div>
            )}

            {/* Stock Actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Actual *
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.currentStock}
                onChange={(e) => handleInputChange("currentStock", e.target.value)}
                placeholder="0"
                className={errors.currentStock ? "border-red-500" : ""}
              />
              {errors.currentStock && (
                <p className="text-red-500 text-xs mt-1">{errors.currentStock}</p>
              )}
            </div>

            {/* Stock Mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Mínimo *
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.minStock}
                onChange={(e) => handleInputChange("minStock", e.target.value)}
                placeholder="0"
                className={errors.minStock ? "border-red-500" : ""}
              />
              {errors.minStock && (
                <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Se mostrarán alertas cuando el stock esté por debajo de este valor
              </p>
            </div>

            {/* Stock Máximo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Máximo (Opcional)
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.maxStock}
                onChange={(e) => handleInputChange("maxStock", e.target.value)}
                placeholder="0"
                className={errors.maxStock ? "border-red-500" : ""}
              />
              {errors.maxStock && (
                <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Referencia para compras y gestión de almacén
              </p>
            </div>

            {/* Costo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo por Unidad (Opcional)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange("cost", e.target.value)}
                placeholder="0.00"
                className={errors.cost ? "border-red-500" : ""}
              />
              {errors.cost && (
                <p className="text-red-500 text-xs mt-1">{errors.cost}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Para calcular valor total del inventario
              </p>
            </div>



            {/* Error general */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 order-2 sm:order-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span className="hidden sm:inline">Guardando...</span>
                    <span className="sm:hidden">...</span>
                  </div>
                ) : (
                  <>
                    <span className="hidden sm:inline">{ingredient ? "Actualizar" : "Crear Ingrediente"}</span>
                    <span className="sm:hidden">{ingredient ? "Actualizar" : "Crear"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
