"use client"

import { type InvoiceStats } from "@/features/billing/hooks/useInvoices"

interface InvoicesStatsProps {
  stats: InvoiceStats | null
  formatCurrency: (amount: number | string) => string
}

export default function InvoicesStats({ stats, formatCurrency }: InvoicesStatsProps) {
  if (!stats) return null

  const statsConfig = [
    { label: 'Facturas Hoy', value: stats.summary.totalInvoices, color: 'blue' },
    { label: 'Ingresos Hoy', value: formatCurrency(stats.summary.totalRevenue), color: 'emerald' },
    { label: 'Ticket Promedio', value: formatCurrency(stats.summary.averageTicket), color: 'orange' },
    { label: 'Top Pago', value: stats.byPaymentMethod[0]?.method || 'N/A', subValue: `${stats.byPaymentMethod[0]?.count || 0} op.`, color: 'purple' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
      {statsConfig.map((stat) => (
        <div 
          key={stat.label} 
          className="p-4 bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm flex flex-col items-center justify-center text-center space-y-1"
        >
          <div className={`text-xl sm:text-2xl font-black tracking-tighter text-${stat.color}-500`}>
            {stat.value}
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground tracking-widest opacity-60 truncate w-full text-center">
            {stat.label}
            {stat.subValue && (
              <span className="block text-[8px] normal-case tracking-normal opacity-70">
                ({stat.subValue})
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
