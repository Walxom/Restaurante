"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  status: string
  statusText: string
}

interface StockAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ingredient: Ingredient | null
}

export default function StockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  ingredient
}: StockAdjustModalProps) {
  const [action, setAction] = useState<"add" | "subtract" | "set">("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewStock, setPreviewStock] = useState<number | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAction("add")
      setQuantity("")
      setReason("")
      setErrors({})
      setPreviewStock(null)
    }
  }, [isOpen])

  // Calculate preview stock
  useEffect(() => {
    if (ingredient && quantity && !isNaN(Number(quantity))) {
      const qty = Number(quantity)
      let newStock = ingredient.currentStock

      switch (action) {
        case "add":
          newStock = ingredient.currentStock + qty
          break
        case "subtract":
          newStock = Math.max(0, ingredient.currentStock - qty)
          break
        case "set":
          newStock = qty
          break
      }

      setPreviewStock(newStock)
    } else {
      setPreviewStock(null)
    }
  }, [action, quantity, ingredient])

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

    // Para "subtract", no puede ser mayor al stock actual
    if (action === "subtract" && ingredient && numQuantity > ingredient.currentStock) {
      newErrors.quantity = `No puedes reducir más de ${ingredient.currentStock} ${ingredient.unit}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ingredient || !validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        action,
        quantity: Number(quantity),
        reason: reason.trim() || null
      }

      const response = await fetch(`/api/ingredients/${ingredient.id}/stock`, {
        method: "PATCH",
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
        setErrors({ submit: error.error || "Error al ajustar el stock" })
      }
    } catch (error) {
      console.error("Error al ajustar stock:", error)
      setErrors({ submit: "Error al conectar con el servidor" })
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

  const getPreviewStatusColor = (stock: number) => {
    if (!ingredient) return "text-gray-600"
    
    const percentage = stock / ingredient.minStock
    if (stock === 0) return "text-gray-600"
    if (percentage <= 0.2) return "text-red-600"
    if (percentage <= 1) return "text-yellow-600"
    return "text-green-600"
  }

  const getPreviewStatusText = (stock: number) => {
    if (!ingredient) return ""
    
    const percentage = stock / ingredient.minStock
    if (stock === 0) return "Agotado"
    if (percentage <= 0.2) return "Stock Crítico"
    if (percentage <= 1) return "Stock Bajo"
    return "Stock OK"
  }

  if (!isOpen || !ingredient) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">
            Ajustar Stock
          </h3>
          <p className="text-gray-600 mb-4">
            {ingredient.name} • Stock actual: {ingredient.currentStock} {ingredient.unit}
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
                {action === "set" ? "Nuevo Stock" : "Cantidad"} ({ingredient.unit})
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

            {/* Preview */}
            {previewStock !== null && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {ingredient.currentStock} {ingredient.unit} → 
                    <span className={`font-medium ml-1 ${getPreviewStatusColor(previewStock)}`}>
                      {previewStock} {ingredient.unit}
                    </span>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getPreviewStatusColor(previewStock)}`}>
                    {getPreviewStatusText(previewStock)}
                  </span>
                </div>
              </div>
            )}

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
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Ajustando...
                  </div>
                ) : (
                  `${getActionText()} Stock`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
