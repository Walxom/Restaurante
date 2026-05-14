"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle, LayoutGrid } from "lucide-react"

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
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    description: "Mesa lista para recibir nuevos comensales",
  },
  OCUPADA: {
    label: "Ocupada",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    description: "Mesa con servicios y pedidos en curso",
  },
  ESPERANDO: {
    label: "Esperando",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    description: "Mesa reservada o pendiente de limpieza rápida",
  },
  FUERA_DE_SERVICIO: {
    label: "Fuera de Servicio",
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    description: "Mesa inactiva por mantenimiento o limpieza profunda",
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <Card className="w-full max-w-lg bg-background border-none shadow-2xl rounded-2xl overflow-hidden scale-in-center">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 ring-8 ring-blue-500/10">
            <LayoutGrid className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Mesa {table.number}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estado Actual:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm ${statusConfig[table.status].color}`}>
              {statusConfig[table.status].label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Selecciona el nuevo estado:
            </p>

            <div className="grid gap-3">
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isLoading || status === table.status}
                  className={`group p-4 rounded-xl border-2 text-left transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                    status === table.status
                      ? 'border-primary bg-primary/5 shadow-inner ring-2 ring-primary/10'
                      : 'border-border/50 bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-lg hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border uppercase shadow-sm ${config.color}`}>
                        {config.label}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 font-medium leading-relaxed group-hover:text-foreground transition-colors">
                        {config.description}
                      </p>
                    </div>
                    {status === table.status ? (
                      <div className="ml-4 p-2 bg-primary/20 rounded-full">
                        <span className="text-[10px] text-primary font-black uppercase tracking-tighter">Actual</span>
                      </div>
                    ) : (
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-shake flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-border/50 -mx-6 px-6 py-4 bg-muted/30 dark:bg-muted/10">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground rounded-xl px-6 font-medium transition-all"
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
