import { useState } from "react"
import { CartItem, Product } from "@/types"

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const addToCart = (product: Product, quantity: number = 1, productNotes?: string) => {
    const existingItem = cartItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity, notes: productNotes || item.notes }
          : item
      ))
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
        notes: productNotes
      }])
    }
  }

  const updateCartItem = (productId: string, quantity: number, productNotes?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCartItems(cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity, notes: productNotes !== undefined ? productNotes : item.notes }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId))
  }

  const clearCart = () => {
    setCartItems([])
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  return {
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    calculateTotal
  }
}
