"use client"

import { Sale } from "@/features/dashboard/hooks/useSales"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Receipt, User, Clock, MapPin, ShoppingBag, CreditCard } from "lucide-react"
import ThermalPrintButton from "@/features/billing/components/ThermalPrintButton"
import { useSession } from "next-auth/react"
import { createMockOrder, createMockOrderItem } from "@/lib/type-converters"

interface SaleDetailsModalProps {
  sale: Sale | null
  onClose: () => void
}

export function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  const { data: session } = useSession()

  if (!sale) return null

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(numAmount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop de alto contraste */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-2xl bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]">
        
        {/* Header Premium */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Detalle del Pedido</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID Transacción: #{sale.orderNumber}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido con Scroll Personalizado */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          
          {/* Grid de Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Atención Técnica</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/30 border border-border/50">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Responsable</span>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{sale.user?.name || '---'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/30 border border-border/50">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Cronología</span>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{new Date(sale.createdAt).toLocaleString('es-PE')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Localización y Estado</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/30 border border-border/50">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Punto de Entrega</span>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{sale.table ? `Mesa ${sale.table.number}` : 'Para llevar'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/30 border border-border/50">
                  <div className={`h-1.5 w-1.5 rounded-full ${sale.status === 'COMPLETED' ? 'bg-emerald-500 pulse' : 'bg-rose-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Estado Final</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sale.status === 'COMPLETED' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {sale.status === 'COMPLETED' ? 'Validada / Pagada' : 'Operación Cancelada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Desglose de Productos</h3>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">
                {sale.orderItems.length} Posiciones
              </span>
            </div>
            <div className="rounded-3xl border border-border/50 overflow-hidden bg-background/30">
              <table className="w-full text-left">
                <thead className="bg-foreground/5 border-b border-border/50">
                  <tr>
                    <th className="py-3 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descripción</th>
                    <th className="py-3 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Cant.</th>
                    <th className="py-3 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Unitario</th>
                    <th className="py-3 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sale.orderItems.map((item, idx) => {
                    const price = typeof item.product.price === 'string' ? parseFloat(item.product.price) : item.product.price
                    return (
                      <tr key={idx} className="hover:bg-foreground/[0.02] transition-colors">
                        <td className="py-3 px-4 text-[10px] font-black text-foreground uppercase tracking-widest">{item.product.name}</td>
                        <td className="py-3 px-4 text-[10px] font-black text-foreground uppercase tracking-widest text-center">x{item.quantity}</td>
                        <td className="py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">{formatCurrency(price)}</td>
                        <td className="py-3 px-4 text-[10px] font-black text-foreground uppercase tracking-widest text-right">{formatCurrency(price * item.quantity)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer / Acciones */}
        <div className="p-8 border-t border-border/50 bg-foreground/[0.02] flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Total Liquidado</span>
            <span className={`text-2xl font-black tracking-tight ${sale.status === 'CANCELLED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {formatCurrency(sale.totalAmount)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {sale.status === 'COMPLETED' && (
              <ThermalPrintButton 
                order={createMockOrder({
                  id: sale.id,
                  orderNumber: sale.orderNumber,
                  totalAmount: Number(sale.totalAmount) || 0,
                  status: 'COMPLETED',
                  createdAt: sale.createdAt,
                  table: sale.table ? { 
                    id: '', 
                    number: sale.table.number, 
                    status: 'OCUPADA', 
                    capacity: 0 
                  } : null,
                  user: { id: '', name: sale.user?.name || '' },
                  orderItems: sale.orderItems.map((item, index) => createMockOrderItem({
                    id: `item-${index}`,
                    quantity: item.quantity,
                    unitPrice: Number(item.product.price) || 0,
                    subtotal: item.quantity * (Number(item.product.price) || 0),
                    status: 'SERVED',
                    product: {
                      id: '',
                      name: item.product.name,
                      price: Number(item.product.price) || 0,
                      categoryId: '',
                      isAvailable: true,
                      isActive: true,
                      category: { id: '', name: '' }
                    }
                  }))
                })}
                currentUser={{
                  id: session?.user?.id || '',
                  name: session?.user?.name || '',
                  role: session?.user?.role || ''
                }}
              />
            )}
            <Button
              onClick={onClose}
              className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 transition-all shadow-xl shadow-black/10"
            >
              Finalizar Vista
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
