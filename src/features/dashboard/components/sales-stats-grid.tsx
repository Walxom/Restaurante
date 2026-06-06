"use client"

import { type SalesStats } from "@/features/dashboard/hooks/useSales"
import { DollarSign, ShoppingCart, TrendingUp, X } from "lucide-react"

interface SalesStatsGridProps {
  stats: SalesStats
}

export function SalesStatsGrid({ stats }: SalesStatsGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
  }

  const statCards = [
    {
      title: "Ventas Totales",
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      glow: "shadow-emerald-500/20"
    },
    {
      title: "Ticket Promedio",
      value: formatCurrency(stats.averageTicket),
      icon: ShoppingCart,
      color: "from-blue-500 to-indigo-600",
      glow: "shadow-blue-500/20"
    },
    {
      title: "Completadas",
      value: stats.completedOrders.toString(),
      icon: TrendingUp,
      color: "from-sky-500 to-blue-600",
      glow: "shadow-sky-500/20"
    },
    {
      title: "Canceladas",
      value: stats.cancelledOrders.toString(),
      icon: X,
      color: "from-rose-500 to-red-600",
      glow: "shadow-rose-500/20"
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, idx) => (
        <div 
          key={idx}
          className={`relative group overflow-hidden bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm transition-all duration-500 hover:shadow-lg ${card.glow} hover:-translate-y-1`}
        >
          {/* Fondo decorativo con gradiente */}
          <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150`} />
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                {card.title}
              </p>
              <h3 className="text-xl font-black text-foreground tracking-tight">
                {card.value}
              </h3>
            </div>
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg shadow-black/5`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
