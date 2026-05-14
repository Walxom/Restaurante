"use client"

import { Sale } from "@/hooks/useSales"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, MapPin, User, Clock, Hash } from "lucide-react"

interface SalesTableProps {
  sales: Sale[]
  paginationLoading: boolean
  onViewDetails: (sale: Sale) => void
}

export function SalesTable({ sales, paginationLoading, onViewDetails }: SalesTableProps) {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(numAmount)
  }

  if (sales.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <Hash className="w-10 h-10 text-muted-foreground opacity-20" />
        </div>
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Sin registros de venta</h3>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Ajusta los filtros para visualizar datos históricos</p>
      </div>
    )
  }

  return (
    <div className={`bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-sm transition-all duration-500 ${paginationLoading ? 'opacity-50 grayscale' : 'opacity-100'}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-foreground/5 border-b border-border/50">
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pedido</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ubicación</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atención</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha / Hora</th>
              <th className="text-right py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</th>
              <th className="text-center py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sales.map((sale) => (
              <tr 
                key={sale.id} 
                className="group hover:bg-foreground/[0.02] transition-colors duration-300"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Hash className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">#{sale.orderNumber}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {sale.status === "COMPLETED" ? (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Completada</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cancelada</span>
                    </div>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {sale.table ? `Mesa ${sale.table.number}` : 'Llevar'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[100px]">
                      {sale.user?.name || '---'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                      {new Date(sale.createdAt).toLocaleDateString('es-PE')}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(sale.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={`text-xs font-black tracking-widest ${sale.status === 'CANCELLED' ? 'line-through opacity-40' : 'text-foreground'}`}>
                    {formatCurrency(sale.totalAmount)}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(sale)}
                    className="h-8 w-8 rounded-lg p-0 text-primary hover:bg-primary/10 transition-all group-hover:scale-110"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
