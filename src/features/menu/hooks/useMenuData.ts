"use client"

import { useEffect, useState } from "react"
import { Category, Product } from "@/types"

export default function useMenuData() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories?showAll=true")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (e) {
      console.error("useMenuData: fetchCategories", e)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (e) {
      console.error("useMenuData: fetchProducts", e)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeletedProducts = async () => {
    try {
      const res = await fetch("/api/products/deleted")
      if (res.ok) {
        const data = await res.json()
        setDeletedProducts(data)
      }
    } catch (e) {
      console.error("useMenuData: fetchDeletedProducts", e)
    }
  }

  const refresh = async () => {
    setIsLoading(true)
    await Promise.all([fetchCategories(), fetchProducts(), fetchDeletedProducts()])
    setIsLoading(false)
  }

  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      if (res.ok) {
        await refresh()
        return true
      }
      return false
    } catch (e) {
      console.error("useMenuData: deleteCategory", e)
      return false
    }
  }

  const toggleCategory = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/categories/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      })
      if (res.ok) {
        await refresh()
        return true
      }
      return false
    } catch (e) {
      console.error("useMenuData: toggleCategory", e)
      return false
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (res.ok) {
        await refresh()
        return true
      }
      return false
    } catch (e) {
      console.error("useMenuData: deleteProduct", e)
      return false
    }
  }

  const recoverProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/deleted`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      })
      if (res.ok) {
        await refresh()
        return true
      }
      return false
    } catch (e) {
      console.error("useMenuData: recoverProduct", e)
      return false
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    categories,
    products,
    deletedProducts,
    isLoading,
    refresh,
    fetchCategories,
    fetchProducts,
    fetchDeletedProducts,
    deleteCategory,
    toggleCategory,
    deleteProduct,
    recoverProduct,
  }
}
