import { useState, useEffect } from "react"
import { type CartItem, type Product } from "@/types"

const CART_STORAGE_KEY = "restaurant_cart_items"

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart))
      } catch (e) {
        console.error("Error loading cart from storage", e)
      }
    }
    setIsHydrated(true)
  }, [])

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    }
  }, [cartItems, isHydrated])

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
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  return {
    cartItems: isHydrated ? cartItems : [],
    isHydrated,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    calculateTotal
  }
}
