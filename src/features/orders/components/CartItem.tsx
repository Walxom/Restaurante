"use client"

import { Trash2, Plus, Minus } from "lucide-react"
import { Input } from "@/components/ui/input"

interface CartItemProps {
  item: {
    productId: string
    name: string
    price: number
    quantity: number
    notes?: string
  }
  index: number
  onUpdateQuantity: (quantity: number) => void
  onUpdateNotes: (notes: string) => void
  onRemove: () => void
}

export function CartItem({
  item,
  index,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove
}: CartItemProps) {
  return (
    <div 
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
          onClick={onRemove}
          className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border/30">
          <button
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center text-xs font-black">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
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
          onChange={(e) => onUpdateNotes(e.target.value)}
          className="text-[10px] h-9 bg-background/50 border-border/30 rounded-xl focus:ring-blue-500/20 px-3"
        />
      </div>
    </div>
  )
}
