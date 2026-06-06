"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

import { type IngredientCategory } from "@/types"

export function useInventoryCategories() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ingredient-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchCategories()
    }
  }, [session, fetchCategories])

  const deleteCategory = async (id: string) => {
    const response = await fetch(`/api/ingredient-categories/${id}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      await fetchCategories()
      return { success: true }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.error }
    }
  }

  return {
    categories,
    isLoading,
    refresh: fetchCategories,
    deleteCategory
  }
}
