"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Ingredient, PaginationData } from "@/types"
import { useOrdersSocket } from "@/hooks/useSocket"

export function useInventory() {
  const { data: session } = useSession()
  const router = useRouter()

  // Data States
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [allDeletedIngredients, setAllDeletedIngredients] = useState<Ingredient[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Selection States
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])

  const fetchAllIngredients = useCallback(async () => {
    try {
      setIsLoading(true)
      const [ingRes, delRes] = await Promise.all([
        fetch('/api/ingredients?all=true'),
        fetch('/api/ingredients/deleted?all=true')
      ])
      
      if (ingRes.ok) {
        const data = await ingRes.json()
        setAllIngredients(data.ingredients || data)
      }
      
      if (delRes.ok) {
        const data = await delRes.json()
        setAllDeletedIngredients(data.ingredients || data)
      }
    } catch (error) {
      console.error("Error al cargar ingredientes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Filtering Logic (Client Side)
  const processIngredients = useCallback(() => {
    let filtered = allIngredients.filter(ingredient => {
      const matchesSearch = !searchTerm || ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const stockPercentage = ingredient.currentStock / ingredient.minStock
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'low' && stockPercentage > 0.2 && stockPercentage <= 1) ||
        (stockFilter === 'critical' && ingredient.currentStock > 0 && stockPercentage <= 0.2) ||
        (stockFilter === 'empty' && ingredient.currentStock === 0)

      const matchesCategory = categoryFilter === 'all' || ingredient.categoryId === categoryFilter

      return matchesSearch && matchesStock && matchesCategory
    })

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      switch (sortBy) {
        case 'name': aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase(); break
        case 'stock': aValue = a.currentStock; bValue = b.currentStock; break
        case 'category': aValue = a.category?.name?.toLowerCase() || ''; bValue = b.category?.name?.toLowerCase() || ''; break
        case 'cost': aValue = a.cost || 0; bValue = b.cost || 0; break
        default: aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase()
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Pagination
    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const items = filtered.slice(startIndex, startIndex + itemsPerPage)

    setIngredients(items)
    setPagination({
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    })
  }, [allIngredients, searchTerm, stockFilter, categoryFilter, sortBy, sortOrder, currentPage, itemsPerPage])

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchAllIngredients()
    }
  }, [session, fetchAllIngredients])

  useEffect(() => {
    processIngredients()
  }, [processIngredients])

  // Integración de Sockets para actualización en tiempo real
  useOrdersSocket({
    onOrderStatusChanged: (data) => {
      // Si el pedido se marca como SERVED o COMPLETED (descuenta) o PENDING/CANCELLED (devuelve/deshace)
      if (['SERVED', 'COMPLETED', 'CANCELLED', 'PENDING'].includes(data.status)) {
        fetchAllIngredients()
      }
    },
    onOrderItemUpdate: (data) => {
      // Si un item cambia a SERVED (descuenta stock) o vuelve a PENDING (devuelve stock por deshacer)
      if (data.action === 'updated' && ['SERVED', 'PENDING'].includes(data.itemData?.status)) {
        fetchAllIngredients()
      }
    }
  })

  // Reset page on filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stockFilter, categoryFilter])

  const toggleSelectIngredient = (id: string) => {
    setSelectedIngredients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIngredients(prev => 
      prev.length === ingredients.length ? [] : ingredients.map(i => i.id)
    )
  }

  return {
    ingredients,
    allIngredients,
    pagination,
    isLoading,
    searchTerm,
    setSearchTerm,
    stockFilter,
    setStockFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedIngredients,
    setSelectedIngredients,
    toggleSelectIngredient,
    toggleSelectAll,
    allDeletedIngredients,
    refresh: fetchAllIngredients
  }
}
