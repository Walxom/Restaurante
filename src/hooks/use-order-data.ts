import { useState, useEffect } from "react"
import { Table, Category, Product } from "@/types"

export function useOrderData() {
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data.filter((table: Table) => 
          table.status === "DISPONIBLE" || table.status === "ESPERANDO" || table.status === "OCUPADA"
        ))
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.filter((product: Product) => product.isActive && product.isAvailable))
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    }
  }

  useEffect(() => {
    Promise.all([
      fetchTables(),
      fetchCategories(),
      fetchProducts()
    ]).finally(() => setIsLoading(false))
  }, [])

  return {
    tables,
    categories,
    products,
    isLoading,
    refreshTables: fetchTables
  }
}
