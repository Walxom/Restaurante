"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

import { ShoppingCart, Trash2, Plus, Minus, Info, AlertCircle, Package, Truck, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

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
        <div className="animate-in fade-in slide-in-from-top duration-500">
          {orderType === 'MESA' && (
            selectedTable ? (
              <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-blue-500 text-sm uppercase tracking-wider">Mesa {selectedTable.number}</div>
                  <div className="text-[11px] text-blue-500/70 font-bold uppercase tracking-tight">
                    CAPACIDAD: {selectedTable.capacity} PERSONAS
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-amber-600 text-sm uppercase tracking-wider">Mesa no seleccionada</div>
                  <div className="text-[10px] text-amber-600/70 font-bold uppercase tracking-tight">
                    POR FAVOR, SELECCIONA UNA MESA
                  </div>
                </div>
              </div>
            )
          )}

          {orderType === 'PARA_LLEVAR' && (
            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-amber-600 text-sm uppercase tracking-wider">Para Llevar</div>
                <div className="text-[10px] text-amber-600/70 font-bold uppercase tracking-tight">
                  RECOJO EN MOSTRADOR
                </div>
              </div>
            </div>
          )}

          {orderType === 'DELIVERY' && (
            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-indigo-500 text-sm uppercase tracking-wider">Delivery</div>
                <div className="text-[10px] text-indigo-500/70 font-bold uppercase tracking-tight">
                  ENVÍO A DOMICILIO
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Items */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4 text-muted-foreground/20">
                <ShoppingCart className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">El carrito está vacío</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold">Agrega platos del menú para continuar</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={item.productId} 
                className="bg-background/40 backdrop-blur-sm p-4 rounded-3xl border border-border/50 transition-all hover:border-blue-500/30 group animate-in slide-in-from-right duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-black text-sm text-foreground group-hover:text-blue-500 transition-colors line-clamp-1">{item.name}</div>
                    <div className="text-[10px] font-black text-emerald-500 tracking-wider">
                      S/ {Number(item.price).toFixed(2)} C/U
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border/30">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors active:scale-90"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-xs font-black">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Subtotal</div>
                    <div className="font-black text-sm text-foreground">
                      S/ {(Number(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 relative">
                  <Input
                    placeholder="Instrucciones adicionales..."
                    value={item.notes || ""}
                    onChange={(e) => updateNotes(item.productId, e.target.value)}
                    className="text-[10px] h-9 bg-background/50 border-border/30 rounded-xl focus:ring-blue-500/20 px-3"
                  />
                </div>
              </div>
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

