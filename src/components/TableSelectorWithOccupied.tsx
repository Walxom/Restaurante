"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Plus, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

interface TableSelectorWithOccupiedProps {
  tables: Table[]
  selectedTable: Table | null
  onSelectTable: (table: Table) => void
  showOccupied?: boolean
}

import { cn } from "@/lib/utils"

export default function TableSelectorWithOccupied({ 
  tables, 
  selectedTable, 
  onSelectTable,
  showOccupied = false 
}: TableSelectorWithOccupiedProps) {
  const router = useRouter()

  const availableTables = tables.filter(table => table.status === 'DISPONIBLE')
  const occupiedTables = tables.filter(table => table.status === 'OCUPADA' || table.status === 'ESPERANDO')

  const handleAdditionalOrder = async (table: Table) => {
    try {
      const response = await fetch(`/api/orders?tableId=${table.id}`)
      if (response.ok) {
        const allOrders = await response.json()
        const activeOrders = allOrders.filter((order: any) => 
          !['CANCELLED', 'COMPLETED'].includes(order.status)
        )
        
        if (activeOrders.length > 0) {
          router.push(`/pedidos/${activeOrders[0].id}/detalles`)
        } else {
          router.push('/pedidos/nuevo')
        }
      }
    } catch (error) {
      console.error('Error al buscar pedidos de la mesa:', error)
      router.push('/pedidos/nuevo')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
      case 'ESPERANDO':
        return 'bg-amber-500/10 text-amber-500 ring-amber-500/20'
      case 'OCUPADA':
        return 'bg-rose-500/10 text-rose-500 ring-rose-500/20'
      default:
        return 'bg-muted text-muted-foreground ring-border/50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DISPONIBLE': return 'Disponible'
      case 'ESPERANDO': return 'Esperando'
      case 'OCUPADA': return 'Ocupada'
      case 'FUERA_DE_SERVICIO': return 'Inactivo'
      default: return status
    }
  }

  if (availableTables.length === 0 && occupiedTables.length === 0) {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-muted-foreground opacity-20" />
        </div>
        <p className="text-muted-foreground font-medium">No hay mesas configuradas</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Mesas Disponibles */}
      {availableTables.length > 0 && (
        <div className="animate-in fade-in duration-700">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {availableTables.map((table) => {
              const isSelected = selectedTable?.id === table.id
              return (
                <button
                  key={table.id}
                  onClick={() => onSelectTable(table)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 active:scale-95 group",
                    isSelected 
                      ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10" 
                      : "bg-background/40 border-border/50 hover:border-border/80 hover:bg-background/60"
                  )}
                >
                  <div className={cn(
                    "text-xl font-black mb-0.5 tracking-tighter",
                    isSelected ? "text-white" : "text-foreground group-hover:text-blue-500"
                  )}>
                    {table.number}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                    isSelected ? "text-blue-100" : "text-muted-foreground"
                  )}>
                    <Users className="w-3 h-3" />
                    {table.capacity}p
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mesas Ocupadas */}
      {showOccupied && occupiedTables.length > 0 && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            Mesas Ocupadas o en Espera ({occupiedTables.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {occupiedTables.map((table) => (
              <div
                key={table.id}
                className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl p-5 transition-all hover:shadow-lg hover:shadow-rose-500/5 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-3xl font-black text-foreground group-hover:text-rose-500 transition-colors leading-none">
                    {table.number}
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1",
                    getStatusColor(table.status)
                  )}>
                    {getStatusText(table.status)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold mb-5">
                  <Users className="w-4 h-4" />
                  {table.capacity} Personas
                </div>
                
                <button
                  onClick={() => handleAdditionalOrder(table)}
                  className="w-full bg-foreground/5 hover:bg-foreground/10 text-foreground py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-border/50"
                >
                  Ver Detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío local */}
      {availableTables.length === 0 && !showOccupied && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 text-center animate-in fade-in">
          <Users className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
          <p className="text-amber-500/80 font-bold text-sm uppercase tracking-widest">No hay mesas disponibles en este momento</p>
          <p className="text-muted-foreground text-xs mt-2 font-medium">Todas las mesas del restaurante están ocupadas o inactivas.</p>
        </div>
      )}
    </div>
  )
}