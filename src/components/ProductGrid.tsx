"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Product, CartItem } from "@/types"

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product, quantity: number, notes?: string) => void
  cartItems: CartItem[]
}

import { Plus, Minus, MoreHorizontal, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ProductGrid({ products, onAddToCart, cartItems }: ProductGridProps) {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})
  const [notes, setNotes] = useState<{ [key: string]: string }>({})
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  const getQuantity = (productId: string) => quantities[productId] || 1
  const getNotes = (productId: string) => notes[productId] || ""

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity >= 1) {
      setQuantities({ ...quantities, [productId]: quantity })
    }
  }

  const updateNotes = (productId: string, productNotes: string) => {
    setNotes({ ...notes, [productId]: productNotes })
  }

  const handleAddToCart = (product: Product) => {
    const quantity = getQuantity(product.id)
    const productNotes = getNotes(product.id)
    onAddToCart(product, quantity, productNotes || undefined)

    setQuantities({ ...quantities, [product.id]: 1 })
    setNotes({ ...notes, [product.id]: "" })
    setExpandedProduct(null)
  }

  const getCartQuantity = (productId: string) => {
    const cartItem = cartItems.find(item => item.productId === productId)
    return cartItem ? cartItem.quantity : 0
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-muted-foreground opacity-20" />
        </div>
        <p className="text-muted-foreground font-medium">No hay productos en esta categoría</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map((product) => {
        const cartQuantity = getCartQuantity(product.id)
        const isExpanded = expandedProduct === product.id

        return (
          <div
            key={product.id}
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
                  onClick={() => updateQuantity(product.id, getQuantity(product.id) - 1)}
                  disabled={getQuantity(product.id) <= 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors disabled:opacity-30 active:scale-90"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-black">
                  {getQuantity(product.id)}
                </span>
                <button
                  onClick={() => updateQuantity(product.id, getQuantity(product.id) + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
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
                  value={getNotes(product.id)}
                  onChange={(e) => updateNotes(product.id, e.target.value)}
                  className="text-[10px] h-8 bg-background/50 border-border/30 rounded-xl"
                />
              </div>
            )}

            {/* Botón de Agregar */}
            <Button
              onClick={() => handleAddToCart(product)}
              className={cn(
                "w-full rounded-xl h-9 text-[11px] font-black tracking-wider transition-all duration-300 active:scale-95",
                cartQuantity > 0
                  ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  : "bg-foreground/10 hover:bg-foreground/20 text-foreground border border-border/50"
              )}
              size="sm"
            >
              AGREGAR + S/ {(Number(product.price) * getQuantity(product.id)).toFixed(2)}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

