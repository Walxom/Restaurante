"use client"

import { Eye, Clock, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getStatusColor, getStatusText, getOrderTypeInfo } from "@/lib/order-utils"

interface OrderCardProps {
  order: any
  onClick: () => void
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const typeInfo = getOrderTypeInfo(order.type, order.table?.number)

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-[0.99] relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-slate-500/[0.02] group-hover:bg-transparent transition-colors" />
      <div className="relative z-10">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate tracking-tight">
                Pedido #{order.orderNumber}
              </h3>
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="h-4 w-4 text-slate-500" />
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
