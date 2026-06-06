"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, FileText, MapPin, User, ShoppingCart } from "lucide-react"
import { type Order } from "@/types"
import { getStatusColor, getStatusText, getOrderTypeLabel } from "@/features/orders/utils/order-utils"

interface EditOrderHeaderProps {
  order: Order
  onBack: () => void
}

export function EditOrderHeader({ order, onBack }: EditOrderHeaderProps) {
  const getHeaderTitle = () => {
    switch (order.status) {
      case "PENDING":
        return `Editar Pedido #${order.orderNumber}`
      case "CONFIRMED":
        return `Modificar Pedido #${order.orderNumber}`
      default:
        return `Agregar Items a Pedido #${order.orderNumber}`
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300"
            aria-label="Volver al panel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-10 w-10 shrink-0 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-widest truncate">
                {getHeaderTitle()}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  {order.type === "MESA" && order.table ? (
                    <>
                      <MapPin className="w-2.5 h-2.5 inline text-primary" />
                      Mesa {order.table.number}
                    </>
                  ) : order.type === "DELIVERY" ? (
                    <>
                      <User className="w-2.5 h-2.5 inline text-primary" />
                      Delivery
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-2.5 h-2.5 inline text-primary" />
                      Para llevar
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Edición en Progreso</span>
        </div>
      </div>
    </header>
  )
}
