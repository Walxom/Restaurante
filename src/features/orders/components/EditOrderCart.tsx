"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Clock,
  Notebook,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { OrderItem } from "@/types"

interface EditOrderCartProps {
  servedItems: OrderItem[]
  orderItems: OrderItem[]
  orderNotes: string
  setOrderNotes: (notes: string) => void
  onUpdateQuantity: (id: string, qty: number) => void
  onUpdateNotes: (id: string, notes: string) => void
  onRemoveItem: (id: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  orderStatus?: string
  servedTotal: number
  pendingTotal: number
  grandTotal: number
}

export function EditOrderCart({
  servedItems,
  orderItems,
  orderNotes,
  setOrderNotes,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  onSave,
  onCancel,
  isSaving,
  orderStatus = "PENDING",
  servedTotal,
  pendingTotal,
  grandTotal
}: EditOrderCartProps) {
  const canCancel = !["COMPLETED", "SERVED", "CANCELLED"].includes(orderStatus)

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xl shadow-shadow/5 space-y-6">
      
      {/* 1. Items Ya Servidos (Solo Lectura) */}
      {servedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <h2 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                Items Ya Servidos
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Entregados y confirmados en mesa (solo lectura)
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {servedItems.map((item) => (
              <div
                key={item.id}
                className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl p-3.5 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 truncate">
                    {item.product.name}
                  </h4>
                  <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">
                    Servido
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-bold">
                  <span>Cantidad: {item.quantity}</span>
                  <span className="text-emerald-500 font-extrabold">
                    S/ {(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>

                {item.notes && (
                  <p className="text-[10px] text-emerald-600/70 italic bg-emerald-500/[0.05] p-2 rounded-xl border border-emerald-500/5 break-words">
                    Nota: {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider pt-2 border-t border-border/20 text-emerald-600">
            <span>Subtotal Servido</span>
            <span>S/ {servedTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* 2. Items Nuevos/Pendientes (Editables) */}
      <div className="space-y-4 pt-4 border-t border-border/20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <div>
            <h2 className="text-xs font-black text-foreground uppercase tracking-widest">
              {orderItems.length > 0 ? "Items Nuevos / Pendientes" : "Comanda Vacía"}
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {orderItems.length > 0 ? "Modifica cantidades o agrega nuevos platos" : "Agrega productos del menú izquierdo"}
            </p>
          </div>
        </div>

        {orderItems.length === 0 ? (
          <div className="text-center py-10 bg-background/30 rounded-2xl border border-dashed border-border/60">
            <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
              No hay productos editables
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {orderItems.map((item) => (
              <div
                key={item.id}
                className={`border border-border/50 rounded-2xl p-3.5 space-y-3 transition-colors ${
                  item.isNew ? "bg-primary/[0.02] border-primary/20" : "bg-background/40"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-bold text-xs text-foreground truncate">
                      {item.product.name}
                    </h4>
                    {item.isNew && (
                      <span className="text-[7px] bg-primary/10 border border-primary/20 text-primary font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0">
                        Nuevo
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-0 rounded-lg transition-all duration-300"
                    aria-label="Quitar plato"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Cantidad */}
                  <div className="flex items-center bg-muted/40 rounded-xl p-0.5 border border-border/40 shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background text-foreground transition-colors active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background text-foreground transition-colors active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal Item */}
                  <span className="text-xs sm:text-sm font-black text-primary shrink-0">
                    S/ {(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>

                {/* Notas de Item */}
                <Input
                  placeholder="Instrucciones especiales para cocina..."
                  value={item.notes || ""}
                  onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                  className="text-[10px] h-8 bg-background/30 border-border/40 rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary/50 text-foreground"
                />
              </div>
            ))}
          </div>
        )}

        {orderItems.length > 0 && (
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider pt-2 border-t border-border/20 text-primary">
            <span>Subtotal Pendientes</span>
            <span>S/ {pendingTotal.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* 3. Notas del Pedido */}
      <div className="space-y-2 pt-4 border-t border-border/20">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 ml-1">
          <Notebook className="w-3.5 h-3.5 text-primary" />
          Notas de la Comanda
        </label>
        <Textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Notas generales o especificaciones de entrega de este pedido..."
          className="text-xs bg-background/50 border-border/60 focus-visible:ring-primary/50 rounded-2xl resize-none min-h-[70px] text-foreground p-3.5"
          rows={3}
        />
      </div>

      {/* 4. Resumen y Acciones */}
      <div className="space-y-4 pt-4 border-t border-border/20">
        {/* Total General */}
        {(servedItems.length > 0 || orderItems.length > 0) && (
          <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-4 flex justify-between items-center shadow-inner">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Total General
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-500">
              S/ {grandTotal.toFixed(2)}
            </span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-2.5">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
          >
            {isSaving ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando cambios...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </div>
            )}
          </Button>

          {/* Cancelar */}
          {canCancel && (
            <Button
              onClick={onCancel}
              variant="destructive"
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 transition-all duration-300"
            >
              Cancelar Pedido
            </Button>
          )}

          {/* Mensaje informativo */}
          {!canCancel && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 text-center p-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Pedido {orderStatus === "COMPLETED" ? "completado" : "servido"} - No puede ser cancelado</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
