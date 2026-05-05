"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface Table {
  id: string
  number: number
  capacity: number
  status: "DISPONIBLE" | "OCUPADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"
  isActive: boolean
}

interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (table: any) => void
  table: {
    id: string
    number: number
    capacity: number
    status: "DISPONIBLE" | "OCUPADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"
  } | null
}

export default function TableModal({ isOpen, onClose, onSave, table }: TableModalProps) {
  const [number, setNumber] = useState("")
  const [capacity, setCapacity] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      if (table) {
        // Modo edición
        setNumber(table.number.toString())
        setCapacity(table.capacity.toString())
      } else {
        // Modo creación
        setNumber("")
        setCapacity("")
      }
      setError("")
    }
  }, [isOpen, table])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const data = {
        number: parseInt(number),
        capacity: parseInt(capacity),
      }

      let response
      if (table) {
        // Actualizar mesa existente
        response = await fetch(`/api/tables/${table.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        // Crear nueva mesa
        response = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }

      if (response.ok) {
        const updatedTable = table ? { ...table, ...data } : data
        onSave(updatedTable)
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al guardar la mesa")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!table) return
    
    if (!confirm("¿Estás seguro de que quieres eliminar esta mesa?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onSave(table)
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al eliminar la mesa")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {table ? `Editar Mesa ${table.number}` : "Nueva Mesa"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Mesa *
              </label>
              <Input
                id="number"
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                min="1"
                placeholder="Ej: 1, 2, 3..."
              />
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacidad (personas) *
              </label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                min="1"
                max="20"
                placeholder="Ej: 2, 4, 6..."
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-between space-x-3 pt-4">
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading 
                    ? "Guardando..." 
                    : table 
                      ? "Actualizar" 
                      : "Crear Mesa"
                  }
                </Button>
              </div>
              
              {table && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? "Eliminando..." : "Eliminar"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
