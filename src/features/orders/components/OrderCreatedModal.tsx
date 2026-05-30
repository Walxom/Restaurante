"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Check, 
  Eye, 
  ArrowRight, 
  ShoppingCart, 
  Receipt, 
  Hash, 
  Utensils, 
  Package, 
  Truck 
} from "lucide-react"
import { useRouter } from "next/navigation"

interface OrderCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  orderNumber: string
  orderId: string
  orderType: string
  tableNumber?: number
  totalAmount: number
  isPrintSkipped?: boolean
}

export default function OrderCreatedModal({ 
  isOpen, 
  onClose, 
  orderNumber, 
  orderId,
  orderType,
  tableNumber,
  totalAmount,
  isPrintSkipped = false
}: OrderCreatedModalProps) {
  const router = useRouter()

  const handleViewOrder = () => {
    router.push(`/pedidos/${orderId}/detalles`)
    onClose()
  }

  const handleBackToOrders = () => {
    router.push('/pedidos')
    onClose()
  }

  const handleModalClose = (open: boolean) => {
    if (!open) onClose()
  }

  const getOrderIcon = () => {
    switch (orderType) {
      case 'MESA': return <Utensils className="w-4 h-4" />
      case 'PARA_LLEVAR': return <Package className="w-4 h-4" />
      case 'DELIVERY': return <Truck className="w-4 h-4" />
      default: return <Receipt className="w-4 h-4" />
    }
  }

  const getOrderTypeDisplay = () => {
    switch (orderType) {
      case 'MESA': return `Mesa ${tableNumber}`
      case 'DELIVERY': return 'Delivery'
      case 'PARA_LLEVAR': return 'Para llevar'
      default: return orderType
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-md mx-auto bg-card/40 backdrop-blur-2xl border-border/50 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden outline-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Pedido Creado Exitosamente</DialogTitle>
        </DialogHeader>
        
        <div className="relative p-8 text-center space-y-8">
          {/* Decoración de fondo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[80px] -z-10 rounded-full" />
          
          {/* Animación del check - Estilo Premium */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full scale-110" />
            <div className="relative bg-emerald-500 rounded-[2rem] w-24 h-24 flex items-center justify-center shadow-xl shadow-emerald-500/40 transform rotate-12">
              <Check className="h-12 w-12 text-white -rotate-12 animate-in zoom-in duration-500" />
            </div>
          </div>

          {/* Mensaje principal */}
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground tracking-tighter">
              Pedido Confirmado
            </h2>
            <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest">
              Registro completado exitosamente
            </p>
          </div>

          {/* Ticket Digital de Resumen */}
          <div className="bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Receipt className="w-16 h-16 text-foreground" />
            </div>
            
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Hash className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Código</span>
              </div>
              <span className="font-black text-xl text-foreground">#{orderNumber}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  {getOrderIcon()}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atención</span>
              </div>
              <span className="font-black text-sm text-foreground uppercase tracking-tight">{getOrderTypeDisplay()}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total del Pedido</span>
              </div>
              <span className="font-black text-2xl text-emerald-500 tracking-tighter">S/ {totalAmount.toFixed(2)}</span>
            </div>
          </div>


          {/* Mensaje de Cocina */}
          {isPrintSkipped ? (
            <div className="flex items-center gap-3 bg-amber-500/5 px-4 py-3 rounded-2xl border border-amber-500/10">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50" />
              <p className="text-[11px] font-black text-amber-500/90 uppercase tracking-wider text-left">
                Impresión omitida (Servicio deshabilitado)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-blue-500/5 px-4 py-3 rounded-2xl border border-blue-500/10">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
              <p className="text-[11px] font-bold text-blue-500/80 uppercase tracking-tight text-left">
                Comanda enviada a cocina automáticamente
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button
              onClick={handleViewOrder}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Eye className="h-5 w-5 mr-3" />
              Ver Detalles
            </Button>
            
            <Button
              onClick={handleBackToOrders}
              variant="ghost"
              className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
            >
              Ir al listado
              <ArrowRight className="h-4 w-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}