"use client"

import { useState, useMemo } from "react"
import { type Product, type CartItem } from "@/types"
import { ProductCard } from "@/features/orders/components/ProductCard"
import { StateFeedback } from "@/components/ui/StateFeedback"

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product, quantity: number, notes?: string) => void
  cartItems: CartItem[]
}

export default function ProductGrid({ products, onAddToCart, cartItems }: ProductGridProps) {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})
  const [notes, setNotes] = useState<{ [key: string]: string }>({})
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  // Indexar cantidades de carrito en un mapa para búsqueda O(1)
  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of cartItems) {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity)
    }
    return map
  }, [cartItems])

  const getQuantity = (productId: string) => quantities[productId] || 1
  const getNotes = (productId: string) => notes[productId] || ""

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity >= 1) {
      setQuantities(prev => ({ ...prev, [productId]: quantity }))
    }
  }

  const updateNotes = (productId: string, productNotes: string) => {
    setNotes(prev => ({ ...prev, [productId]: productNotes }))
  }

  const handleAddToCart = (product: Product) => {
    const quantity = getQuantity(product.id)
    const productNotes = getNotes(product.id)
    onAddToCart(product, quantity, productNotes || undefined)

    setQuantities(prev => ({ ...prev, [product.id]: 1 }))
    setNotes(prev => ({ ...prev, [product.id]: "" }))
    setExpandedProduct(null)
  }

  if (products.length === 0) {
    return (
      <StateFeedback
        title="No hay productos"
        description="No encontramos platos en esta categoría. Intenta con otra o contacta a soporte si crees que es un error."
        variant="empty"
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          cartQuantity={cartQuantityMap.get(product.id) || 0}
          quantity={getQuantity(product.id)}
          notes={getNotes(product.id)}
          isExpanded={expandedProduct === product.id}
          onUpdateQuantity={(q) => updateQuantity(product.id, q)}
          onUpdateNotes={(n) => updateNotes(product.id, n)}
          onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
          onAddToCart={() => handleAddToCart(product)}
        />
      ))}
    </div>
  )
}
