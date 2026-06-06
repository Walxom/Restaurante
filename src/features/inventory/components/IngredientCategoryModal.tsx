"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type IngredientCategory } from "@/types"

interface IngredientCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: IngredientCategory | null
}

const defaultColors = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6B7280", // Gray
]

export default function IngredientCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  category
}: IngredientCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: defaultColors[0],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resetear formulario cuando cambia la categoría o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name,
          description: category.description || "",
          color: category.color || defaultColors[0],
        })
      } else {
        setFormData({
          name: "",
          description: "",
          color: defaultColors[0],
        })
      }
      setErrors({})
    }
  }, [isOpen, category])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.length > 50) {
      newErrors.name = "El nombre es muy largo (máximo 50 caracteres)"
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = "La descripción es muy larga (máximo 200 caracteres)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const url = category
        ? `/api/ingredient-categories/${category.id}`
        : '/api/ingredient-categories'

      const method = category ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        if (errorData.error === 'Ya existe una categoría con ese nombre') {
          setErrors({ name: 'Ya existe una categoría con ese nombre' })
        } else {
          setErrors({ general: errorData.error || 'Error al guardar la categoría' })
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setErrors({ general: 'Error de conexión' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar Categoría" : "Nueva Categoría de Ingredientes"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Modifica los datos de la categoría de ingredientes"
              : "Crea una nueva categoría para organizar tus ingredientes"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Carnes, Verduras, Lácteos..."
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción opcional de la categoría..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color de la categoría</Label>
            <div className="grid grid-cols-5 gap-2">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${formData.color === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                    } transition-all`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="w-12 h-8 p-1 border rounded"
              />
              <span className="text-sm text-gray-600">O elige un color personalizado</span>
            </div>
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : (category ? "Actualizar" : "Crear Categoría")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}