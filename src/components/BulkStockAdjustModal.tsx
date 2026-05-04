"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  status: string
  statusText: string
  category?: {
    name: string
    color: string
  }
}

interface BulkStockAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedIngredients: Ingredient[]) => void
  ingredients: Ingredient[]
}

export default function BulkStockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  ingredients
}: BulkStockAdjustModalProps) {
  const [action, setAction] = useState<"add" | "subtract" | "set">("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAction("add")
      setQuantity("")
      setReason("")
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validación básica: debe ser un número válido
    if (!quantity || isNaN(Number(quantity))) {
      newErrors.quantity = "Debe ingresar un número válido"
      setErrors(newErrors)
      return false
    }

    const numQuantity = Number(quantity)

    // Para "add" y "subtract", la cantidad debe ser mayor que 0
    if ((action === "add" || action === "subtract") && numQuantity <= 0) {
      newErrors.quantity = "La cantidad debe ser un número positivo"
    }

    // Para "set", permitir 0 o mayor (no negativo)
    if (action === "set" && numQuantity < 0) {
      newErrors.quantity = "El stock no puede ser negativo"
    }

    // Para "subtract", verificar que no exceda el stock mínimo disponible
    if (action === "subtract") {
      const hasInsufficientStock = ingredients.some(ing => numQuantity > ing.currentStock)
      if (hasInsufficientStock) {
        const minStock = Math.min(...ingredients.map(ing => ing.currentStock))
        newErrors.quantity = `No puedes reducir más de ${minStock} unidades (el menor stock actual)`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateNewStock = (ingredient: Ingredient, qty: number) => {
    switch (action) {
      case "add":
        return ingredient.currentStock + qty
      case "subtract":
        return Math.max(0, ingredient.currentStock - qty)
      case "set":
        return qty
      default:
        return ingredient.currentStock
    }
  }

  const getStatusInfo = (stock: number, minStock: number) => {
    if (stock <= 0) return { text: "Sin Stock", color: "text-gray-600", bgColor: "bg-gray-100" }
    if (stock <= minStock * 0.2) return { text: "Stock Crítico", color: "text-red-600", bgColor: "bg-red-50" }
    if (stock <= minStock) return { text: "Stock Bajo", color: "text-yellow-600", bgColor: "bg-yellow-50" }
    return { text: "Stock OK", color: "text-green-600", bgColor: "bg-green-50" }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const qty = Number(quantity)
      const ingredientIds = ingredients.map(ing => ing.id)
      
      // Hacer la llamada a la API para ajuste masivo
      const response = await fetch('/api/ingredients/bulk-stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredientIds,
          action,
          quantity: qty,
          reason: reason || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al ajustar stock')
      }

      const data = await response.json()
      
      // Usar los ingredientes actualizados que devuelve la API
      onSuccess(data.ingredients)
      onClose()
    } catch (error) {
      console.error("Error al ajustar stock:", error)
      setErrors({ submit: error instanceof Error ? error.message : "Error al conectar con el servidor" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActionText = () => {
    switch (action) {
      case "add": return "Agregar"
      case "subtract": return "Reducir"
      case "set": return "Establecer"
      default: return ""
    }
  }

  const getActionDescription = () => {
    switch (action) {
      case "add": return "Agregar stock (compras, reposición)"
      case "subtract": return "Reducir stock (uso, desperdicio, venta)"
      case "set": return "Establecer stock específico (inventario manual)"
      default: return ""
    }
  }

  if (!isOpen || ingredients.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">
            Ajustar Stock
          </h3>
          <p className="text-gray-600 mb-4">
            Ajustar stock para {ingredients.length} ingredientes seleccionados
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Acción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ajuste
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={action === "add" ? "default" : "outline"}
                  onClick={() => setAction("add")}
                  className="text-xs"
                >
                  + Agregar
                </Button>
                <Button
                  type="button"
                  variant={action === "subtract" ? "default" : "outline"}
                  onClick={() => setAction("subtract")}
                  className="text-xs"
                >
                  - Reducir
                </Button>
                <Button
                  type="button"
                  variant={action === "set" ? "default" : "outline"}
                  onClick={() => setAction("set")}
                  className="text-xs"
                >
                  = Establecer
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getActionDescription()}
              </p>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {action === "set" ? "Nuevo Stock" : "Cantidad"} (unidades)
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  if (errors.quantity) {
                    setErrors(prev => ({ ...prev, quantity: "" }))
                  }
                }}
                placeholder={action === "set" ? "Stock total" : "Cantidad a ajustar"}
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Lista de ingredientes seleccionados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredientes que se actualizarán:
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {ingredients.map(ingredient => {
                    const qty = quantity && !isNaN(Number(quantity)) ? Number(quantity) : 0
                    const newStock = quantity && !isNaN(Number(quantity)) ? calculateNewStock(ingredient, qty) : ingredient.currentStock
                    const statusInfo = getStatusInfo(newStock, ingredient.minStock)
                    
                    return (
                      <div key={ingredient.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ingredient.name}</span>
                            {ingredient.category && (
                              <span 
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                style={{ 
                                  backgroundColor: ingredient.category.color + '20', 
                                  color: ingredient.category.color 
                                }}
                              >
                                {ingredient.category.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ingredient.currentStock} {ingredient.unit} → 
                            <span className={`font-medium ml-1 ${statusInfo.color}`}>
                              {newStock} {ingredient.unit}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${statusInfo.color} ${statusInfo.bgColor}`}
                          >
                            {statusInfo.text}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Razón */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón (Opcional)
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Compra de mercadería, uso en cocina, inventario"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                Para llevar registro de los cambios
              </p>
            </div>

            {/* Error general */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || quantity === "" || isNaN(Number(quantity))}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Procesando..." : `${getActionText()} Stock`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}