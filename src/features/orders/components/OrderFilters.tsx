"use client"

import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderFiltersProps {
  filter: "active" | "completed" | "cancelled"
  setFilter: (filter: "active" | "completed" | "cancelled") => void
  orderCounts: {
    active: number
    completed: number
    cancelled: number
  }
}

export function OrderFilters({ filter, setFilter, orderCounts }: OrderFiltersProps) {
  const tabs = [
    { id: 'active', label: 'Activos', count: orderCounts.active, icon: Clock },
    { id: 'completed', label: 'Completados', count: orderCounts.completed, icon: CheckCircle },
    { id: 'cancelled', label: 'Cancelados', count: orderCounts.cancelled, icon: XCircle },
  ] as const

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-sm border border-border/50 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:shadow-md transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center md:text-left">
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Estado de Pedidos</h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">
          Monitor de ventas en tiempo real
        </p>
      </div>
      <div className="flex flex-wrap justify-center md:justify-end gap-2 sm:gap-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            variant={filter === tab.id ? "default" : "outline"}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm px-4 h-11 transition-all duration-300 hover:scale-[1.02] active:scale-95 border-border/50 min-w-[120px] font-bold",
              filter === tab.id 
                ? "shadow-lg shadow-primary/20 hover:shadow-primary/30" 
                : "bg-background/50 text-muted-foreground hover:bg-accent"
            )}
          >
            <tab.icon className={cn("h-4 w-4", filter === tab.id ? "animate-pulse" : "")} />
            <span className="font-bold text-xs uppercase tracking-wider">{tab.label}</span>
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors",
              filter === tab.id ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
