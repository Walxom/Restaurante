"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface Table {
  id: string
  number: number
  capacity: number
  status: "DISPONIBLE" | "OCUPADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"
  isActive: boolean
}

interface StatusChangeModalProps {
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

const statusConfig = {
  DISPONIBLE: {
    label: "Disponible",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Mesa lista para ser ocupada",
  },
  OCUPADA: {
    label: "Ocupada",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Mesa con clientes actualmente",
  },
  FUERA_DE_SERVICIO: {
    label: "Fuera de Servicio",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Mesa no disponible temporalmente",
  },
  ESPERANDO: {
    label: "Esperando",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Mesa reservada o en espera",
  },
}

export default function StatusChangeModal({ isOpen, onClose, onSave, table }: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen || !table) return null

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onSave({ ...table, status: newStatus })
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al cambiar el estado")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            Cambiar Estado - Mesa {table.number}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Estado actual: <span className={`px-2 py-1 rounded-full text-xs border ${statusConfig[table.status].color}`}>
              {statusConfig[table.status].label}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 mb-4">
              Selecciona el nuevo estado para la mesa:
            </p>

            <div className="grid gap-3">
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isLoading || status === table.status}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    status === table.status
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm border ${config.color}`}>
                        {config.label}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    </div>
                    {status === table.status && (
                      <span className="text-xs text-gray-500 font-medium">ACTUAL</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
