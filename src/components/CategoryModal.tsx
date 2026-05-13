"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Category } from "@/types"

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  category: Category | null
}

export default function CategoryModal({ isOpen, onClose, onSave, category }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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
        })
      } else {
        setFormData({
          name: "",
          description: "",
        })
      }
      setErrors({})
    }
  }, [isOpen, category])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = category
        ? `/api/categories/${category.id}`
        : "/api/categories"

      const method = category ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al guardar la categoría" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return

    if (!confirm("¿Estás seguro de que quieres eliminar esta categoría? Esta acción no se puede deshacer.")) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al eliminar la categoría" })
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {category ? "Editar Categoría" : "Nueva Categoría"}
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
                placeholder="Ej: Entradas, Platos Principales, Bebidas..."
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
                placeholder="Descripción opcional de la categoría..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {category && (
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
                {isLoading ? "Guardando..." : category ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
