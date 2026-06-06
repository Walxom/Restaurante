"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Clock, Undo2, MessageSquare, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { type OrderItem } from "@/types"

interface OrderItemsListProps {
  orderId: string
  items: OrderItem[]
  onItemStatusChange: () => void
  canMarkAsServed?: boolean
}

export default function OrderItemsList({
  orderId,
  items,
  onItemStatusChange,
  canMarkAsServed = true
}: OrderItemsListProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        onItemStatusChange()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'SERVED':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "group relative bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 p-5 transition-all duration-300 hover:border-blue-500/30 overflow-hidden animate-in slide-in-from-bottom duration-500",
            item.status === 'SERVED' ? "opacity-80" : "shadow-lg shadow-blue-500/5"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Indicador lateral de estado */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 transition-colors",
            item.status === 'SERVED' ? "bg-emerald-500" : "bg-blue-500"
          )} />

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 space-y-3">
              {/* Header del Item */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                  item.status === 'SERVED' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {item.status === 'SERVED' ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-black text-foreground tracking-tight truncate leading-none">
                      {item.product.name}
                    </h4>
                    <span className="text-sm font-black bg-foreground/10 px-2 py-0.5 rounded-lg text-foreground/70">
                      x{item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border",
                      getStatusStyles(item.status)
                    )}>
                      {item.status === 'PENDING' ? 'En Cocina' : 'Servido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalles y Notas */}
              <div className="grid gap-2 ml-12">
                {item.notes && (
                  <div className="flex items-start gap-2 bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10 max-w-xl">
                    <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-blue-500/80 leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    S/ {Number(item.unitPrice).toFixed(2)} unit.
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                  <div className="text-emerald-500">
                    Total S/ {Number(item.subtotal).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 shrink-0 justify-end sm:justify-start">
              {canMarkAsServed && item.status === 'PENDING' && (
                <Button
                  onClick={() => updateItemStatus(item.id, 'SERVED')}
                  disabled={updatingItems.has(item.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {updatingItems.has(item.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Marcar Servido
                    </div>
                  )}
                </Button>
              )}

              {canMarkAsServed && item.status === 'SERVED' && (
                <Button
                  onClick={() => updateItemStatus(item.id, 'PENDING')}
                  disabled={updatingItems.has(item.id)}
                  className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20 h-10 rounded-xl px-4 font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all"
                >
                  {updatingItems.has(item.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500/30 border-t-amber-500" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Undo2 className="w-3.5 h-3.5" />
                      Deshacer
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}