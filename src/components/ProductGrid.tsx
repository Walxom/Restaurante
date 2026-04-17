"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string
  isAvailable: boolean
  isActive: boolean
  categoryId: string
  category: {
    id: string
    name: string
  }
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product, quantity: number, notes?: string) => void
  cartItems: CartItem[]
}

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
    
    // Reset quantity and notes after adding
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
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No hay productos disponibles en esta categoría</p>
        <p className="text-gray-400 text-sm mt-2">
          Selecciona otra categoría o contacta al administrador
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {products.map((product) => {
        const cartQuantity = getCartQuantity(product.id)
        const isExpanded = expandedProduct === product.id
        
        return (
          <div 
            key={product.id} 
            className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow"
          >
            {/* Header del Producto */}
            <div className="mb-2">
              <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-green-600">
                  S/ {Number(product.price).toFixed(2)}
                </span>
                {cartQuantity > 0 && (
                  <span className="text-xs text-blue-600 font-medium">
                    ({cartQuantity})
                  </span>
                )}
              </div>
            </div>

            {/* Controles de Cantidad */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(product.id, getQuantity(product.id) - 1)}
                  disabled={getQuantity(product.id) <= 1}
                  className="h-6 w-6 p-0 text-xs"
                >
                  -
                </Button>
                <span className="mx-1 min-w-[20px] text-center text-sm font-medium">
                  {getQuantity(product.id)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(product.id, getQuantity(product.id) + 1)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  +
                </Button>
              </div>
              <Button
                onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-xs"
              >
                {isExpanded ? "↑" : "⋯"}
              </Button>
            </div>

            {/* Notas Opcionales */}
            {isExpanded && (
              <div className="mb-2">
                <Input
                  placeholder="Notas..."
                  value={getNotes(product.id)}
                  onChange={(e) => updateNotes(product.id, e.target.value)}
                  className="text-xs h-7"
                />
              </div>
            )}

            {/* Botón de Agregar */}
            <Button
              onClick={() => handleAddToCart(product)}
              className="w-full bg-blue-600 hover:bg-blue-700 h-7"
              size="sm"
            >
              <span className="text-xs">
                + S/ {(Number(product.price) * getQuantity(product.id)).toFixed(2)}
              </span>
            </Button>
          </div>
        )
      })}
    </div>
  )
}
