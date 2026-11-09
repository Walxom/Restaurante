"use client"

import { memo } from "react"
import { type Product } from "@/types"
import { Plus, Minus, MoreHorizontal, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: Product
  cartQuantity: number
  quantity: number
  notes: string
  isExpanded: boolean
  onUpdateQuantity: (quantity: number) => void
  onUpdateNotes: (notes: string) => void
  onToggleExpand: () => void
  onAddToCart: () => void
}

function ProductCardBase({
  product,
  cartQuantity,
  quantity,
  notes,
  isExpanded,
  onUpdateQuantity,
  onUpdateNotes,
  onToggleExpand,
  onAddToCart
}: ProductCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-background/40 backdrop-blur-sm border border-border/50 rounded-2xl p-3 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5",
        cartQuantity > 0 ? "ring-2 ring-blue-500/50" : ""
      )}
    >
      {/* Header del Producto */}
      <div className="mb-3">
        <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
          {product.name}
        </h3>
        <div className="flex justify-between items-center">
          <span className="text-sm font-black text-emerald-500">
            S/ {Number(product.price).toFixed(2)}
          </span>
          {cartQuantity > 0 && (
            <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full ring-1 ring-blue-500/20">
              <span className="text-[10px] font-black text-blue-500">
                {cartQuantity} EN LISTA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Cantidad */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border/30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(quantity - 1);
            }}
            disabled={quantity <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors disabled:opacity-30 active:scale-90"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-black">
            {quantity}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(quantity + 1);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors active:scale-90"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
            isExpanded ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-muted/30 hover:bg-muted/50 border border-border/30"
          )}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
        </button>
      </div>

      {/* Notas Opcionales */}
      {isExpanded && (
        <div className="mb-3 animate-in slide-in-from-top duration-300">
          <Input
            placeholder="Instrucciones esp..."
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] h-8 bg-background/50 border-border/30 rounded-xl"
          />
        </div>
      )}

      {/* Botón de Agregar */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart();
        }}
        className={cn(
          "w-full rounded-xl h-9 text-[11px] font-black tracking-wider transition-all duration-300 active:scale-95",
          cartQuantity > 0
            ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
            : "bg-foreground/10 hover:bg-foreground/20 text-foreground border border-border/50"
        )}
        size="sm"
      >
        AGREGAR + S/ {(Number(product.price) * quantity).toFixed(2)}
      </Button>
    </div>
  )
}

export const ProductCard = memo(ProductCardBase, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.cartQuantity === next.cartQuantity &&
    prev.quantity === next.quantity &&
    prev.notes === next.notes &&
    prev.isExpanded === next.isExpanded
  )
})
