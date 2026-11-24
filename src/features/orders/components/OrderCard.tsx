"use client"

import { Eye, Clock, User, Pencil, CheckCircle2, Ban } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getStatusColor, getStatusText, getOrderTypeInfo } from "@/features/orders/utils/order-utils"
import { getNivelSla, getSlaClasses, minutosTranscurridos } from "@/features/orders/utils/sla"

interface OrderCardProps {
  order: any
  onClick: () => void
  onEdit?: (id: string) => void
  onComplete?: (order: any) => void
  onCancel?: (id: string) => void
  /** Marca de tiempo actual (ms) para recalcular el SLA de US-14 sin recargar. */
  ahora?: number
}

export function OrderCard({ order, onClick, onEdit, onComplete, onCancel, ahora }: OrderCardProps) {
  const typeInfo = getOrderTypeInfo(order.type, order.table?.number)
  const nivelSla = getNivelSla(order.status, order.createdAt, ahora)
  const sla = getSlaClasses(nivelSla)

  return (
    <div
      className={cn("bg-white dark:bg-slate-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-[0.99] relative overflow-hidden", sla.borde)}
      data-sla={nivelSla ?? undefined}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-slate-500/[0.02] group-hover:bg-transparent transition-colors" />
      {sla.pulso && <div aria-hidden className={cn(sla.pulso, "z-20")} />}
      <div className="relative z-10">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate tracking-tight">
                Pedido #{order.orderNumber}
              </h3>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-4 w-4 text-slate-500" />
                </div>
                {onEdit && ['PENDING', 'CONFIRMED', 'SERVED'].includes(order.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(order.id)
                    }}
                    className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                    title="Editar pedido"
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </button>
                )}
                {onComplete && order.status === 'SERVED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onComplete(order)
                    }}
                    className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"
                    title="Finalizar venta"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </button>
                )}
                {onCancel && ['PENDING', 'CONFIRMED'].includes(order.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancel(order.id)
                    }}
                    className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors"
                    title="Cancelar pedido"
                  >
                    <Ban className="h-4 w-4 text-rose-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {typeInfo.icon} {typeInfo.label}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  {order.user.name}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <Clock className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-1">•</span>
                {new Date(order.createdAt).toLocaleDateString()}
                {nivelSla && (
                  <span
                    className={cn("ml-1 px-1.5 py-0.5 rounded-md border font-bold opacity-100", sla.insignia)}
                    title="Tiempo de espera (alerta en rojo a partir de 18 min)"
                  >
                    {minutosTranscurridos(order.createdAt, ahora)} min
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border shadow-sm", getStatusColor(order.status))}>
              {getStatusText(order.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
        <div className="space-y-3 mb-4">
          {order.orderItems.slice(0, 3).map((item: any) => (
            <div key={item.id} className="flex justify-between items-center py-0.5 text-sm gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {item.quantity}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.product.name}</span>
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                S/ {Number(item.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
          {order.orderItems.length > 3 && (
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-8 py-1">
              + {order.orderItems.length - 3} productos adicionales
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Total Pedido</span>
          <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
            S/ {Number(order.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>
      </div>
    </div>
  )
}
