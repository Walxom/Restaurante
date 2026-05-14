"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface OrderCartProps {
  items: CartItem[]
  selectedTable: Table | null
  onUpdateItem: (productId: string, quantity: number, notes?: string) => void
  onRemoveItem: (productId: string) => void
  total: number
  onCreateOrder: () => void
  isCreating: boolean
  orderType?: 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'
}

import { ShoppingCart, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { CartItem } from "./orders/CartItem"
import { CartContextInfo } from "./orders/CartContextInfo"
import { StateFeedback } from "./ui/StateFeedback"

export default function OrderCart({ 
  items, 
  selectedTable, 
  onUpdateItem, 
  onRemoveItem, 
  total, 
  onCreateOrder, 
  isCreating,
  orderType = 'MESA'
}: OrderCartProps) {
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(productId)
    } else {
      const item = items.find(i => i.productId === productId)
      onUpdateItem(productId, newQuantity, item?.notes)
    }
  }

  const updateNotes = (productId: string, notes: string) => {
    const item = items.find(i => i.productId === productId)
    if (item) {
      onUpdateItem(productId, item.quantity, notes)
    }
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-120px)] sticky top-24">
      {/* Header del Carrito */}
      <div className="p-6 border-b border-border/50 bg-background/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight leading-none mb-1">Tu Pedido</h2>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {items.length} {items.length === 1 ? "Producto" : "Productos"} seleccionados
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border">
        {/* Información de Contexto */}
        <CartContextInfo orderType={orderType} selectedTable={selectedTable} />

        {/* Lista de Items */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <StateFeedback
              title="Carrito Vacío"
              description="Agrega deliciosos platos del menú para comenzar a armar el pedido."
              variant="empty"
              className="py-12"
            />
          ) : (
            items.map((item, index) => (
              <CartItem
                key={item.productId}
                item={item}
                index={index}
                onUpdateQuantity={(q) => updateQuantity(item.productId, q)}
                onUpdateNotes={(n) => updateNotes(item.productId, n)}
                onRemove={() => onRemoveItem(item.productId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer - Resumen y Acción */}
      {items.length > 0 && (
        <div className="p-6 bg-background/40 backdrop-blur-xl border-t border-border/50 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total a pagar</span>
              <div className="text-3xl font-black text-foreground tracking-tighter">
                <span className="text-emerald-500 mr-1 text-xl">S/</span>
                {Number(total).toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Items</div>
              <div className="w-10 h-6 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 text-xs font-black">
                {items.length}
              </div>
            </div>
          </div>

          <Button
            onClick={onCreateOrder}
            disabled={(orderType === 'MESA' && !selectedTable) || items.length === 0 || isCreating}
            className={cn(
              "w-full h-14 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-xl active:scale-[0.98]",
              isCreating 
                ? "bg-muted cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
            )}
          >
            {isCreating ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-3 border-white/30 border-t-white rounded-full"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Confirmar Pedido</span>
              </div>
            )}
          </Button>

          {orderType === 'MESA' && !selectedTable && (
            <div className="flex items-center justify-center gap-2 text-amber-500 animate-bounce mt-2">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Falta seleccionar mesa</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

