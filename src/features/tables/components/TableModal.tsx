"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle, Trash2, Save, X as CloseIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <Card className="w-full max-w-md bg-background border-none shadow-2xl rounded-2xl overflow-hidden scale-in-center">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 ring-8 ring-blue-500/10">
            <Save className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {table ? `Mesa ${table.number}` : "Nueva Mesa"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">
            {table ? "Actualiza la configuración de esta mesa" : "Registra una nueva mesa en el sistema"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="number" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Número de Mesa
              </label>
              <div className="relative">
                <Input
                  id="number"
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  min="1"
                  placeholder="Ej: 01"
                  className="rounded-xl border-border/50 bg-background/50 focus:ring-primary/20 h-11 pl-4 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="capacity" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Capacidad (Comensales)
              </label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                min="1"
                max="20"
                placeholder="Ej: 4"
                className="rounded-xl border-border/50 bg-background/50 focus:ring-primary/20 h-11 pl-4 font-medium"
              />
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide bg-red-500/10 p-3.5 rounded-xl border border-red-500/20 animate-shake flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 mt-4 border-t border-border/50 -mx-6 px-6 bg-muted/30 dark:bg-muted/10">
              {table && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-xl h-11 px-6 font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isLoading ? "..." : "Eliminar"}
                </Button>
              )}
              
              <div className="flex flex-1 gap-3 py-4 sm:py-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-xl h-11 font-medium text-foreground bg-background border-border hover:bg-accent transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-medium shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {isLoading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {table ? "Guardar" : "Crear"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
