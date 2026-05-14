"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface OrderDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
}

export default function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-card border border-border/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-foreground/5">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">
              Detalles del Pedido
            </h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
              #{order.orderNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-foreground/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
                Información General
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Estado</span>
                  <Badge 
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'COMPLETED' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                    }`}
                  >
                    {order.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Mesa/Tipo</span>
                  <span className="text-sm font-black text-foreground">
                    {order.table ? `Mesa ${order.table.number}` : 'Para llevar'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Mesero</span>
                  <span className="text-sm font-black text-foreground">
                    {order.user?.name || 'No asignado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Fecha</span>
                  <span className="text-xs font-bold text-foreground">
                    {new Date(order.createdAt).toLocaleString('es-PE')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
                Resumen Económico
              </h3>
              <div className="p-4 bg-foreground/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Total de items</span>
                  <span className="text-sm font-black text-foreground">{order.orderItems?.length || 0}</span>
                </div>
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm font-black text-foreground uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-primary tracking-tighter">
                    S/ {typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount).toFixed(2) : order.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Items del pedido */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
              Productos Consumidos
            </h3>
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5">
                  <tr>
                    <th className="text-left py-3 px-4 font-black uppercase tracking-tighter text-[10px] text-muted-foreground">Producto</th>
                    <th className="text-center py-3 px-4 font-black uppercase tracking-tighter text-[10px] text-muted-foreground">Cant.</th>
                    <th className="text-right py-3 px-4 font-black uppercase tracking-tighter text-[10px] text-muted-foreground">P. Unit.</th>
                    <th className="text-right py-3 px-4 font-black uppercase tracking-tighter text-[10px] text-muted-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {order.orderItems?.map((item: any, index: number) => {
                    const unitPrice = typeof item.product.price === "string" ? parseFloat(item.product.price) : item.product.price
                    const subtotal = unitPrice * item.quantity
                    return (
                      <tr key={index} className="hover:bg-foreground/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.product.name}</td>
                        <td className="py-3 px-4 text-center font-black text-muted-foreground">{item.quantity}</td>
                        <td className="py-3 px-4 text-right font-bold text-muted-foreground">S/ {unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-foreground">S/ {subtotal.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-border/50 bg-foreground/5 flex justify-end">
          <Button
            onClick={onClose}
            className="rounded-xl font-black uppercase tracking-widest text-[10px] px-8"
          >
            Cerrar Detalles
          </Button>
        </div>
      </div>
    </div>
  )
}
