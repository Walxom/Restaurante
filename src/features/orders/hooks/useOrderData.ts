import { useState, useEffect, useCallback } from "react"
import { type Table, type Category, type Product } from "@/types"

export function useOrderData() {
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [tablesRes, categoriesRes, productsRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/categories"),
        fetch("/api/products")
      ])

      if (!tablesRes.ok || !categoriesRes.ok || !productsRes.ok) {
        throw new Error("Error al comunicarse con el servidor")
      }

      const [tablesData, categoriesData, productsData] = await Promise.all([
        tablesRes.json(),
        categoriesRes.json(),
        productsRes.json()
      ])

      setTables(tablesData.filter((table: Table) => 
        table.status === "DISPONIBLE" || table.status === "ESPERANDO" || table.status === "OCUPADA"
      ))
      setCategories(categoriesData)
      setProducts(productsData.filter((product: Product) => product.isActive && product.isAvailable))
    } catch (err) {
      console.error("Error al cargar datos del pedido:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    tables,
    categories,
    products,
    isLoading,
    error,
    refreshData: fetchData,
    refreshTables: async () => {
      // Función específica para refrescar solo mesas si es necesario
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data.filter((table: Table) => 
          table.status === "DISPONIBLE" || table.status === "ESPERANDO" || table.status === "OCUPADA"
        ))
      }
    }
  }
}
