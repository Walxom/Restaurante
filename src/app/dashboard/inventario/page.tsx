"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Package, AlertTriangle, Filter, Edit, Trash2, ArrowLeft, CheckCircle, XCircle, Clock, FileX, FolderOpen, Plus, RotateCcw } from "lucide-react"
import IngredientModal from "@/components/IngredientModal"
import StockAdjustModal from "@/components/StockAdjustModal"
import BulkStockAdjustModal from "@/components/BulkStockAdjustModal"
import IngredientCategoryModal from "@/components/IngredientCategoryModal"

interface Ingredient {
  id: string
  name: string
  unit: string
  unitCategory?: string
  currentStock: number
  minStock: number
  maxStock?: number
  cost?: number
  categoryId?: string
  category?: {
    id: string
    name: string
    color: string
  }
  isActive: boolean
  status: string
  statusColor: string
  statusText: string
  stockPercentage: number
  createdAt: string
  updatedAt: string
}

interface IngredientCategory {
  id: string
  name: string
  description?: string
  color?: string
  _count: {
    ingredients: number
  }
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface AlertStats {
  total: number
  empty: number
  critical: number
  low: number
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Estados principales
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]) // Todos los ingredientes para filtrado local
  const [deletedIngredients, setDeletedIngredients] = useState<Ingredient[]>([])
  const [allDeletedIngredients, setAllDeletedIngredients] = useState<Ingredient[]>([]) // Todos los eliminados para filtrado local
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [deletedPagination, setDeletedPagination] = useState<PaginationData | null>(null)
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [isAlertsLoading, setIsAlertsLoading] = useState(false)
  
  // Estados de filtros (sin debounce para búsqueda instantánea)
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteIngredientModal, setShowDeleteIngredientModal] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<IngredientCategory | null>(null)
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null)
  const [showInUseErrorModal, setShowInUseErrorModal] = useState(false)
  const [inUseErrorData, setInUseErrorData] = useState<any>(null)
  
  // Estados de vista

  const [activeTab, setActiveTab] = useState<'inventory' | 'alerts' | 'deleted' | 'categories'>('inventory')
  
  // Estados para selección múltiple
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "JEFE") {
      router.push("/dashboard")
    }
  }, [session, router])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stockFilter, categoryFilter, activeTab])

  // Cargar estadísticas de alertas solo una vez al inicio
  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchAlertStats()
    }
  }, [session])

  // Cargar categorías una sola vez al inicio (necesarias para filtros)
  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchCategoriesInitial()
    }
  }, [session])

  // Cargar datos iniciales (solo una vez por pestaña)
  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      if (activeTab === 'alerts') {
        fetchAlerts()
      } else if (activeTab === 'deleted') {
        fetchAllDeletedIngredients()
      } else if (activeTab === 'categories') {
        fetchCategories()
      } else {
        fetchAllIngredients()
      }
    }
  }, [session, activeTab])

  // Sincronizar selección múltiple
  useEffect(() => {
    setSelectAll(selectedIngredients.length === ingredients.length && ingredients.length > 0)
  }, [selectedIngredients, ingredients])

  // Filtrado y paginación del lado del cliente
  useEffect(() => {
    if (activeTab === 'inventory') {
      const filtered = filterIngredients(allIngredients)
      const sorted = sortIngredients(filtered)
      const paginated = paginateIngredients(sorted)
      setIngredients(paginated.items)
      setPagination(paginated.pagination)
    } else if (activeTab === 'deleted') {
      const filtered = filterDeletedIngredients(allDeletedIngredients)
      const sorted = sortIngredients(filtered)
      const paginated = paginateIngredients(sorted)
      setDeletedIngredients(paginated.items)
      setDeletedPagination(paginated.pagination)
    }
  }, [allIngredients, allDeletedIngredients, searchTerm, stockFilter, categoryFilter, sortBy, sortOrder, currentPage, itemsPerPage, activeTab])

  // Limpiar selección cuando cambian los filtros
  useEffect(() => {
    setSelectedIngredients([])
    setSelectAll(false)
  }, [searchTerm, stockFilter, categoryFilter, currentPage])

  // Funciones de filtrado del lado del cliente
  const filterIngredients = (ingredients: Ingredient[]) => {
    return ingredients.filter(ingredient => {
      // Filtro de búsqueda
      const matchesSearch = !searchTerm || 
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro de stock
      const stockPercentage = ingredient.currentStock / ingredient.minStock
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'low' && stockPercentage > 0.2 && stockPercentage <= 1) ||
        (stockFilter === 'critical' && ingredient.currentStock > 0 && stockPercentage <= 0.2) ||
        (stockFilter === 'empty' && ingredient.currentStock === 0)

      // Filtro de categoría
      const matchesCategory = categoryFilter === 'all' || 
        ingredient.categoryId === categoryFilter

      return matchesSearch && matchesStock && matchesCategory
    })
  }

  const filterDeletedIngredients = (ingredients: Ingredient[]) => {
    return ingredients.filter(ingredient => {
      // Solo filtro de búsqueda para ingredientes eliminados
      return !searchTerm || 
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }

  const sortIngredients = (ingredients: Ingredient[]) => {
    return [...ingredients].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'stock':
          aValue = a.currentStock
          bValue = b.currentStock
          break
        case 'category':
          aValue = a.category?.name?.toLowerCase() || ''
          bValue = b.category?.name?.toLowerCase() || ''
          break
        case 'cost':
          aValue = a.cost
          bValue = b.cost
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const paginateIngredients = (ingredients: Ingredient[]) => {
    const totalItems = ingredients.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const items = ingredients.slice(startIndex, endIndex)

    return {
      items,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    }
  }

  const fetchCategoriesInitial = async () => {
    try {
      const response = await fetch('/api/ingredient-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      if (activeTab === 'categories') {
        setIsCategoriesLoading(true)
      }
      const response = await fetch('/api/ingredient-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    } finally {
      if (activeTab === 'categories') {
        setIsCategoriesLoading(false)
      }
    }
  }

  const fetchAllIngredients = async () => {
    try {
      setIsLoading(true)
      // Cargar TODOS los ingredientes sin paginación para filtrado local
      const response = await fetch('/api/ingredients?all=true')
      if (response.ok) {
        const data = await response.json()
        setAllIngredients(data.ingredients || data)
      }
    } catch (error) {
      console.error("Error al cargar ingredientes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAlertStats = async () => {
    try {
      const response = await fetch('/api/inventory-alerts?statsOnly=true')
      if (response.ok) {
        const data = await response.json()
        setAlertStats(data.stats)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas de alertas:", error)
    }
  }

  const fetchAlerts = async () => {
    try {
      setIsAlertsLoading(true)
      const params = new URLSearchParams()
      
      // Solo aplicar paginación, no filtros de búsqueda, stock o categoría
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/inventory-alerts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setIngredients(data.alerts)
        setPagination(data.pagination)
        // No actualizar stats aquí, solo cuando sea necesario
      }
    } catch (error) {
      console.error("Error al cargar alertas:", error)
    } finally {
      setIsAlertsLoading(false)
    }
  }

  const fetchAllDeletedIngredients = async () => {
    try {
      setIsLoading(true)
      // Cargar TODOS los ingredientes eliminados sin paginación para filtrado local
      const response = await fetch('/api/ingredients/deleted?all=true')
      if (response.ok) {
        const data = await response.json()
        setAllDeletedIngredients(data.ingredients || data)
      }
    } catch (error) {
      console.error("Error al cargar ingredientes eliminados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStockAdjust = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setShowStockModal(true)
  }

  const handleCreateIngredient = () => {
    setSelectedIngredient(null)
    setShowCreateModal(true)
  }

  const handleEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setShowCreateModal(true)
  }

  const handleModalSuccess = () => {
    fetchAllIngredients()
    fetchAlertStats() // Actualizar estadísticas cuando se modifiquen ingredientes
    if (activeTab === 'alerts') {
      fetchAlerts()
    }
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category: IngredientCategory) => {
    setSelectedCategory(category)
    setShowCategoryModal(true)
  }

  const handleCategoryModalSuccess = () => {
    fetchCategories()
    fetchAllIngredients()
  }

  const handleDeleteCategory = (category: IngredientCategory) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/ingredient-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCategories()
        fetchAllIngredients()
        setShowDeleteModal(false)
        setCategoryToDelete(null)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar la categoría')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión al eliminar la categoría')
    }
  }

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient)
    setShowDeleteIngredientModal(true)
  }

  const confirmDeleteIngredient = async () => {
    if (!ingredientToDelete) return

    try {
      const response = await fetch(`/api/ingredients/${ingredientToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        
        // Actualizar las listas locales según el tipo de eliminación
        if (data.type === 'hard_delete') {
          // Eliminación completa - remover de todas las listas
          setAllIngredients(prev => prev.filter(ing => ing.id !== ingredientToDelete.id))
          setAllDeletedIngredients(prev => prev.filter(ing => ing.id !== ingredientToDelete.id))
        } else {
          // Soft delete - mover de ingredientes a eliminados
          const deletedIngredient = allIngredients.find(ing => ing.id === ingredientToDelete.id)
          if (deletedIngredient) {
            setAllIngredients(prev => prev.filter(ing => ing.id !== ingredientToDelete.id))
            setAllDeletedIngredients(prev => [...prev, { ...deletedIngredient, deletedAt: new Date() }])
          }
        }
        
        // Refrescar datos
        fetchAlertStats() // Actualizar estadísticas cuando se elimine un ingrediente
        if (activeTab === 'alerts') {
          fetchAlerts()
        }
        
        setShowDeleteIngredientModal(false)
        setIngredientToDelete(null)
        
        // No mostrar mensajes de éxito, solo actualizar la lista
      } else {
        const errorData = await response.json()
        
        // Manejo específico para ingredientes en uso
        if (errorData.type === 'in_use_error') {
          setInUseErrorData(errorData)
          setShowInUseErrorModal(true)
          setShowDeleteIngredientModal(false)
        } else {
          alert(errorData.error || 'Error al eliminar el ingrediente')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión al eliminar el ingrediente')
    }
  }

  const handleRestoreIngredient = async (ingredient: Ingredient) => {
    try {
      const response = await fetch(`/api/ingredients/${ingredient.id}/restore`, {
        method: 'PATCH'
      })

      if (response.ok) {
        const data = await response.json()
        // Mover de eliminados de vuelta a ingredientes activos
        const restoredIngredient = allDeletedIngredients.find(ing => ing.id === ingredient.id)
        if (restoredIngredient) {
          setAllDeletedIngredients(prev => prev.filter(ing => ing.id !== ingredient.id))
          setAllIngredients(prev => [...prev, { ...restoredIngredient, deletedAt: null }])
        }
        fetchAlertStats() // Actualizar estadísticas cuando se restaure un ingrediente
        // No mostrar mensaje de éxito, solo actualizar la lista
      } else {
        const data = await response.json()
        alert(data.error || 'Error al reactivar ingrediente')
      }
    } catch (error) {
      console.error('Error al reactivar ingrediente:', error)
      alert('Error al reactivar ingrediente')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleFilterReset = () => {
    setSearchTerm("")
    setStockFilter("all")
    setCategoryFilter("all")
    setSortBy("name")
    setSortOrder("asc")
    setCurrentPage(1)
  }

  // Funciones para selección múltiple
  const handleSelectIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      if (prev.includes(ingredientId)) {
        return prev.filter(id => id !== ingredientId)
      } else {
        return [...prev, ingredientId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIngredients([])
    } else {
      setSelectedIngredients(ingredients.map(ing => ing.id))
    }
    setSelectAll(!selectAll)
  }

  const handleBulkStockAdjust = () => {
    if (selectedIngredients.length === 0) {
      alert('Selecciona al menos un ingrediente')
      return
    }
    
    setShowBulkStockModal(true)
  }

  const handleBulkStockSuccess = (updatedIngredients: any[]) => {
    // Actualizar la lista principal con los ingredientes modificados
    const updatedAllIngredients = allIngredients.map(ingredient => {
      const updated = updatedIngredients.find(upd => upd.id === ingredient.id)
      if (updated) {
        // Mantener las propiedades adicionales del ingrediente local
        return {
          ...ingredient,
          currentStock: updated.currentStock,
          status: updated.status,
          statusText: updated.statusText
        }
      }
      return ingredient
    })
    
    setAllIngredients(updatedAllIngredients)
    setSelectedIngredients([])
    setSelectAll(false)
    
    // Refrescar estadísticas de alertas
    fetchAlertStats()
  }

  const handleBulkDelete = async () => {
    if (selectedIngredients.length === 0) {
      alert('Selecciona al menos un ingrediente')
      return
    }
    
    if (confirm(`¿Estás seguro de eliminar ${selectedIngredients.length} ingredientes?\n\nEsta acción no se puede deshacer.`)) {
      try {
        // Hacer la llamada a la API para eliminación masiva
        const response = await fetch('/api/ingredients/bulk-delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ingredientIds: selectedIngredients
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          
          // Si hay ingredientes en uso, mostrar información específica
          if (errorData.ingredientsInUse) {
            const inUseList = errorData.ingredientsInUse
              .map((item: any) => `${item.name} (usado en: ${item.products.join(', ')})`)
              .join('\n')
            
            alert(`No se pueden eliminar algunos ingredientes porque están siendo usados en recetas:\n\n${inUseList}`)
            return
          }
          
          throw new Error(errorData.error || 'Error al eliminar ingredientes')
        }

        const data = await response.json()
        
        // Eliminar de la lista local usando los IDs que se eliminaron exitosamente
        const deletedIds = data.deletedIngredients.map((ing: any) => ing.id)
        const remainingIngredients = allIngredients.filter(ing => !deletedIds.includes(ing.id))
        setAllIngredients(remainingIngredients)
        
        setSelectedIngredients([])
        setSelectAll(false)
        
        // Refrescar estadísticas de alertas
        fetchAlertStats()
        
        alert(data.message || `${deletedIds.length} ingredientes eliminados correctamente`)
      } catch (error) {
        console.error('Error al eliminar ingredientes:', error)
        alert(error instanceof Error ? error.message : 'Error al eliminar los ingredientes. Inténtalo de nuevo.')
      }
    }
  }

  const getStatusBadge = (ingredient: Ingredient) => {
    const variants = {
      ok: "default",
      low: "secondary", 
      critical: "destructive",
      empty: "outline"
    } as const

    return (
      <Badge variant={variants[ingredient.status as keyof typeof variants] || "default"}>
        {ingredient.statusText}
      </Badge>
    )
  }

  const getStockIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'low': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />
      case 'empty': return <FileX className="w-4 h-4 text-gray-600" />
      default: return <Package className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusInfo = (currentStock: number, minStock: number) => {
    const stockPercentage = currentStock / minStock
    
    if (currentStock === 0) {
      return { 
        text: "Agotado", 
        color: "text-gray-600", 
        bgColor: "bg-gray-100" 
      }
    } else if (stockPercentage <= 0.2) {
      return { 
        text: "Stock Crítico", 
        color: "text-red-600", 
        bgColor: "bg-red-100" 
      }
    } else if (stockPercentage <= 1) {
      return { 
        text: "Stock Bajo", 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100" 
      }
    } else {
      return { 
        text: "Stock OK", 
        color: "text-green-600", 
        bgColor: "bg-green-100" 
      }
    }
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
        <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
          <span className="hidden sm:inline">
            Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
            {pagination.totalItems} ingredientes
          </span>
          <span className="sm:hidden">
            {pagination.currentPage} de {pagination.totalPages} páginas
          </span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Anterior</span>
            <span className="sm:hidden">‹</span>
          </Button>
          
          <div className="hidden sm:flex items-center gap-1">
            {pages.map(page => (
              <Button
                key={page}
                variant={page === pagination.currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[32px]"
              >
                {page}
              </Button>
            ))}
          </div>
          
          <div className="sm:hidden flex items-center gap-1 text-sm">
            <span>{pagination.currentPage}</span>
            <span>/</span>
            <span>{pagination.totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <span className="sm:hidden">›</span>
          </Button>
        </div>
      </div>
    )
  }



  if (isLoading && ingredients.length === 0 && activeTab !== 'categories' && activeTab !== 'alerts') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Cargando inventario...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => router.push("/dashboard")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Gestión de Inventario</h1>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              {activeTab !== 'alerts' && (
                <Button 
                  onClick={activeTab === 'categories' ? handleCreateCategory : handleCreateIngredient}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {activeTab === 'categories' ? 'Nueva Categoría' : 'Nuevo Ingrediente'}
                  </span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Control de Inventario</h2>
              <p className="text-sm text-gray-600">Gestiona ingredientes, stock y categorías de manera eficiente</p>
            </div>

      {/* Tabs Simplificadas */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'inventory' | 'alerts' | 'deleted' | 'categories')} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center justify-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventario</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
            {alertStats && alertStats.total > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {alertStats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center justify-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Categorías</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {/* Filtros Simplificados */}
          <Card className="mb-6 border-gray-200">
            <CardContent className="p-3 sm:p-4">
              {/* Barra de búsqueda principal */}
              <div className="mb-4">
                <Input
                  placeholder="Buscar ingredientes por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-base"
                />
              </div>

              {/* Filtros rápidos */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={stockFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={stockFilter === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('low')}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  Stock Bajo
                </Button>
                <Button
                  variant={stockFilter === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('critical')}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Stock Crítico
                </Button>
                <Button
                  variant={stockFilter === 'empty' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('empty')}
                  className="text-gray-600 border-gray-600 hover:bg-gray-50"
                >
                  Agotado
                </Button>
                
                {/* Separador */}
                <div className="border-l border-gray-300 mx-2"></div>
                
                {/* Filtro por categoría simplificado */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botón de limpiar filtros */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFilterReset}
                  className="flex items-center gap-2"
                >
                  Limpiar
                </Button>
              </div>

              {/* Información de resultados */}
              {pagination && (
                <div className="text-sm text-gray-600 mb-4">
                  {pagination.totalItems} ingredientes encontrados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones en lote */}
          {selectedIngredients.length > 0 && (
            <Card className="mb-4 bg-blue-50 border-blue-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedIngredients.length} ingrediente(s) seleccionado(s)
                    </span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkStockAdjust}
                      className="flex-1 sm:flex-none"
                    >
                      Ajustar Stock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Ingredientes */}
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : ingredients.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No se encontraron ingredientes</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || stockFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Comienza agregando tu primer ingrediente'
                  }
                </p>
                <Button onClick={handleCreateIngredient} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Ingrediente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Seleccionar todos */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Seleccionar todos ({ingredients.length} ingredientes)
                </span>
              </div>
              
              {/* Vista de tabla con diseño mejorado */}
              <Card className="border-gray-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <Checkbox
                              checked={selectAll}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingrediente
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Costo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ingredients.map(ingredient => (
                          <tr 
                            key={ingredient.id} 
                            className={`hover:bg-gray-50 ${selectedIngredients.includes(ingredient.id) ? 'bg-blue-50' : ''}`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <Checkbox
                                checked={selectedIngredients.includes(ingredient.id)}
                                onCheckedChange={() => handleSelectIngredient(ingredient.id)}
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-900">
                                  {ingredient.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {ingredient.category ? (
                                <span 
                                  className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                  style={{ 
                                    backgroundColor: ingredient.category.color + '20', 
                                    color: ingredient.category.color,
                                    borderColor: ingredient.category.color 
                                  }}
                                >
                                  {ingredient.category.name}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Sin categoría
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="font-medium">
                                  {ingredient.currentStock} {ingredient.unit}
                                </div>
                                <div className="text-gray-500">
                                  Mín: {ingredient.minStock} {ingredient.unit}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {getStatusBadge(ingredient)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                S/ {Number(ingredient.cost).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStockAdjust(ingredient)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Stock
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditIngredient(ingredient)}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteIngredient(ingredient)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {renderPagination()}
            </>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {/* Estadísticas de Alertas - Diseño Minimalista */}
          {alertStats && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                <div className="text-xs text-red-600 font-medium">Total</div>
                <div className="text-lg font-bold text-red-600">{alertStats.total}</div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-600 font-medium">Agotados</div>
                <div className="text-lg font-bold text-gray-600">{alertStats.empty}</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                <div className="text-xs text-red-600 font-medium">Críticos</div>
                <div className="text-lg font-bold text-red-600">{alertStats.critical}</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                <div className="text-xs text-yellow-600 font-medium">Bajo</div>
                <div className="text-lg font-bold text-yellow-600">{alertStats.low}</div>
              </div>
            </div>
          )}

          {/* Lista de Alertas */}
          {isAlertsLoading ? (
            <div className="text-center py-8">Cargando alertas...</div>
          ) : ingredients.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">¡No hay alertas!</h3>
                <p className="text-gray-600">Todos los ingredientes tienen stock suficiente</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-gray-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingrediente
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Actual
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Mínimo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ingredients.map((ingredient) => (
                          <tr key={ingredient.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {ingredient.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: ingredient.category?.color || '#6B7280' }}
                                />
                                <span className="text-sm text-gray-900">
                                  {ingredient.category?.name || 'Sin categoría'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {ingredient.currentStock} {ingredient.unit}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {ingredient.minStock} {ingredient.unit}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {(() => {
                                const statusInfo = getStatusInfo(ingredient.currentStock, ingredient.minStock)
                                return (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                                    {statusInfo.text}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStockAdjust(ingredient)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Stock
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditIngredient(ingredient)}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteIngredient(ingredient)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {renderPagination()}
            </>
          )}
        </TabsContent>



        <TabsContent value="categories">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Categorías de Ingredientes</h2>
          </div>
          
          {isCategoriesLoading ? (
            <div className="text-center py-8">Cargando categorías...</div>
          ) : categories.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay categorías</h3>
                <p className="text-gray-600 mb-4">
                  Comienza creando tu primera categoría de ingredientes
                </p>
                <Button onClick={handleCreateCategory} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Categoría
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ingredientes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map(category => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: category.color }}
                              />
                              <div className="text-sm font-medium text-gray-900">
                                {category.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {category.description}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {category._count.ingredients} ingredientes
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                                className="text-gray-600 hover:text-gray-700"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCategory(category)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
          </div>
        </div>

      {/* Modales */}
      {showCreateModal && (
        <IngredientModal
          ingredient={selectedIngredient}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showStockModal && selectedIngredient && (
        <StockAdjustModal
          ingredient={selectedIngredient}
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showBulkStockModal && selectedIngredients.length > 0 && (
        <BulkStockAdjustModal
          ingredients={ingredients.filter(ing => selectedIngredients.includes(ing.id))}
          isOpen={showBulkStockModal}
          onClose={() => setShowBulkStockModal(false)}
          onSuccess={handleBulkStockSuccess}
        />
      )}

      {showCategoryModal && (
        <IngredientCategoryModal
          category={selectedCategory}
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={handleCategoryModalSuccess}
        />
      )}

      {/* Modal de confirmación de eliminación de categoría */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar la categoría <strong>"{categoryToDelete.name}"</strong>?
              {categoryToDelete._count.ingredients > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Esta categoría tiene {categoryToDelete._count.ingredients} ingredientes asociados.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setCategoryToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteCategory}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación de ingrediente */}
      {showDeleteIngredientModal && ingredientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar el ingrediente <strong>"{ingredientToDelete.name}"</strong>?
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteIngredientModal(false)
                  setIngredientToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteIngredient}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error para ingredientes en uso */}
      {showInUseErrorModal && inUseErrorData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">No se puede eliminar</h3>
                <p className="text-sm text-gray-600">Ingrediente en uso</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm mb-2">{inUseErrorData.message}</p>
              <p className="text-red-600 text-xs">{inUseErrorData.details}</p>
            </div>

            {inUseErrorData.relatedProducts && inUseErrorData.relatedProducts.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2 text-sm">Productos afectados:</h4>
                <div className="space-y-1">
                  {inUseErrorData.relatedProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{product.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowInUseErrorModal(false)
                  setInUseErrorData(null)
                }}
              >
                Entendido
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowInUseErrorModal(false)
                  setInUseErrorData(null)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir al Menú
              </Button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
