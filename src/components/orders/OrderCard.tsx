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
      className="bg-card/40 backdrop-blur-md rounded-2xl p-4 lg:p-6 shadow-sm border border-border/50 hover:shadow-xl hover:bg-card/60 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 truncate tracking-tight">
                Pedido #{order.orderNumber}
              </h3>
              <div className="p-1.5 bg-muted/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="text-xs font-medium text-muted-foreground mt-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-background/50 rounded-md border border-border/30 text-foreground/80">
                  {typeInfo.icon} {typeInfo.label}
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
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
            <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border", getStatusColor(order.status))}>
              {getStatusText(order.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-background/30 rounded-xl p-4 border border-border/30">
        <div className="space-y-3 mb-4">
          {order.orderItems.slice(0, 3).map((item: any) => (
            <div key={item.id} className="flex justify-between items-center py-0.5 text-sm gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {item.quantity}
                </span>
                <span className="font-bold text-foreground/90 truncate">{item.product.name}</span>
              </div>
              <span className="font-medium text-foreground/70">
                S/ {Number(item.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
          {order.orderItems.length > 3 && (
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-8 py-1">
              + {order.orderItems.length - 3} productos adicionales
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border/30">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Total Pedido</span>
          <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
            S/ {Number(order.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
