"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, RotateCcw, Package, Grid3X3, List, Table } from "lucide-react"
import CategoryModal from "@/components/CategoryModal"
import ProductModal from "@/components/ProductModal"
import ConfirmDialog from "@/components/ConfirmDialog"

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  productCount: number
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string // Can be Decimal from Prisma
  isAvailable: boolean
  isActive: boolean
  categoryId: string
  category: {
    id: string
    name: string
  }
  recipe?: {
    id: string
    instructions: string | null
    prepTime: number | null
    servings: number
    ingredients: Array<{
      id: string
      ingredientId: string
      quantity: number
      unit: string
      ingredient: {
        id: string
        name: string
        unit: string
        currentStock: number
      }
    }>
  }
}

const statusColors = {
  available: "border-gray-200",
  unavailable: "border-gray-200",
  inactive: "border-gray-200",
}

export default function MenuPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"categories" | "products" | "deleted" | "preview">("products")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showOnlyWithRecipe, setShowOnlyWithRecipe] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10



  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false)
  const [productToRecover, setProductToRecover] = useState<Product | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  
  // Estados para modales de confirmación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-product' | 'delete-category' | 'toggle-category'
    item: Product | Category | null
    isLoading: boolean
  }>({ type: 'delete-product', item: null, isLoading: false })

  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "JEFE") {
      router.push("/mesero")
    }
  }, [session, router])

  // Cargar datos
  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchDeletedProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      // Mostrar todas las categorías (activas e inactivas) para administración
      const response = await fetch("/api/categories?showAll=true")
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
        setProducts(data)
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeletedProducts = async () => {
    try {
      const response = await fetch('/api/products/deleted')
      if (response.ok) {
        const data = await response.json()
        setDeletedProducts(data)
      }
    } catch (error) {
      console.error('Error al cargar productos eliminados:', error)
    }
  }

  const handleModalSave = () => {
    fetchCategories()
    fetchProducts()
    fetchDeletedProducts()
  }

  const openCategoryModal = (category?: Category) => {
    setEditingCategory(category || null)
    setShowCategoryModal(true)
  }

  const openProductModal = (product?: Product) => {
    setEditingProduct(product || null)
    setShowProductModal(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setConfirmAction({ type: 'delete-category', item: category, isLoading: false })
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCategory = async () => {
    const category = confirmAction.item as Category
    if (!category) return

    setConfirmAction(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        handleModalSave()
        toast.success("Categoría eliminada completamente de la base de datos")
        setShowDeleteConfirm(false)
        setConfirmAction({ type: 'delete-product', item: null, isLoading: false })
      } else {
        toast.error(data.error || "Error al eliminar la categoría")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    } finally {
      setConfirmAction(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleToggleCategory = (category: Category) => {
    setConfirmAction({ type: 'toggle-category', item: category, isLoading: false })
    setShowToggleConfirm(true)
  }

  const confirmToggleCategory = async () => {
    const category = confirmAction.item as Category
    if (!category) return

    setConfirmAction(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/categories/${category.id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !category.isActive
        })
      })

      const data = await response.json()

      if (response.ok) {
        handleModalSave()
        toast.success(data.message)
        setShowToggleConfirm(false)
        setConfirmAction({ type: 'delete-product', item: null, isLoading: false })
      } else {
        toast.error(data.error || "Error al cambiar el estado de la categoría")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    } finally {
      setConfirmAction(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setConfirmAction({ type: 'delete-product', item: product, isLoading: false })
    setShowDeleteConfirm(true)
  }

  const confirmDeleteProduct = async () => {
    const product = confirmAction.item as Product
    if (!product) return

    setConfirmAction(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        handleModalSave()
        toast.success("Producto eliminado correctamente")
        setShowDeleteConfirm(false)
        setConfirmAction({ type: 'delete-product', item: null, isLoading: false })
      } else {
        toast.error(data.error || "Error al eliminar el producto")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    } finally {
      setConfirmAction(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleRecoverProduct = (product: Product) => {
    setProductToRecover(product)
    setShowRecoverConfirm(true)
  }

  const confirmRecoverProduct = async () => {
    if (!productToRecover) return

    setIsRecovering(true)
    try {
      const response = await fetch(`/api/products/deleted`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: productToRecover.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        handleModalSave()
        toast.success(`Producto "${productToRecover.name}" recuperado exitosamente`)
        setShowRecoverConfirm(false)
        setProductToRecover(null)
      } else {
        toast.error(data.error || "Error al recuperar el producto")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    } finally {
      setIsRecovering(false)
    }
  }

  // Filtrar productos
  const allFilteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory
    
    const matchesRecipe = !showOnlyWithRecipe || (product.recipe && product.recipe.ingredients.length > 0)
    
    return matchesSearch && matchesCategory && matchesRecipe
  })

  // Paginación
  const totalPages = Math.ceil(allFilteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const filteredProducts = allFilteredProducts.slice(startIndex, startIndex + itemsPerPage)

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, showOnlyWithRecipe])

  // Agrupar productos por categoría
  const productsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredProducts.filter(product => product.categoryId === category.id)
    return acc
  }, {} as Record<string, Product[]>)



  const getProductStatus = (product: Product) => {
    if (!product.isActive) return "inactive"
    if (!product.isAvailable) return "unavailable"
    return "available"
  }

  const getProductStatusLabel = (product: Product) => {
    if (!product.isActive) return "Inactivo"
    if (!product.isAvailable) return "No Disponible"
    return "Disponible"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando menú...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestión de Menú</h1>
              <p className="text-sm text-gray-600">Administra categorías y productos</p>
            </div>
            <div className="flex gap-1">
              {activeTab === "categories" && (
                <Button 
                  onClick={() => openCategoryModal()}
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-900"
                >
                  + Categoría
                </Button>
              )}
              {activeTab === "products" && (
                <Button 
                  onClick={() => openProductModal()}
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-900"
                >
                  + Producto
                </Button>
              )}
              <Button 
                onClick={() => router.push("/dashboard")} 
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Volver
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Tabs */}
        <div className="mb-3">
          <div className="border-b border-gray-200">
              <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("categories")}
                  className={`py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                    activeTab === "categories"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  Categorías ({categories.length})
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                    activeTab === "products"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  Productos ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab("deleted")}
                  className={`py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                     activeTab === "deleted"
                       ? "text-gray-900 border-b-2 border-gray-900"
                       : "text-gray-500"
                   }`}
                >
                  Eliminados ({deletedProducts.length})
                </button>

              </nav>
            </div>
        </div>

        {/* Tab Categorías */}
        {activeTab === "categories" && (
          <>


            {/* Vista de Tabla para Categorías */}
            <div>
              <Card className="border border-gray-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-900 text-sm">Categoría</th>
                          <th className="text-left p-4 font-semibold text-gray-900 text-sm">Descripción</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Productos</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Estado</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {categories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <span className={`font-medium ${!category.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                                  {category.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {category.description || '-'}
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-semibold text-gray-900">{category.productCount}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                category.isActive 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {category.isActive ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs px-3 py-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                                  onClick={() => openCategoryModal(category)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs px-3 py-2 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 transition-colors"
                                  onClick={() => handleToggleCategory(category)}
                                >
                                  {category.isActive ? 'Deshabilitar' : 'Habilitar'}
                                </Button>
                                {category.productCount === 0 && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs px-3 py-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                    onClick={() => handleDeleteCategory(category)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Eliminar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Tab Productos */}
        {activeTab === "products" && (
          <>


            {/* Filtros y Selector de Vista */}
            <div className="mb-3 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm h-8"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm h-8 min-w-[120px]"
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 px-2 py-1 border border-gray-300 rounded text-sm h-8 min-w-[140px]">
                  <input
                    type="checkbox"
                    id="recipeFilter"
                    checked={showOnlyWithRecipe}
                    onChange={(e) => setShowOnlyWithRecipe(e.target.checked)}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recipeFilter" className="text-xs whitespace-nowrap">
                    Solo con receta
                  </label>
                </div>
              </div>
              
              {/* Información de paginación */}
              <div className="flex items-center gap-2 justify-end text-xs text-gray-500">
                <span>Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, allFilteredProducts.length)} de {allFilteredProducts.length} productos</span>
              </div>
            </div>

            {/* Vista de Tabla para Productos */}
            <div>
              <Card className="border border-gray-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-900 text-sm">Producto</th>
                          <th className="text-left p-4 font-semibold text-gray-900 text-sm">Categoría</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Precio</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Receta</th>
                          <th className="text-center p-4 font-semibold text-gray-900 text-sm">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-medium text-gray-900">
                                  {product.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-sm text-gray-600 font-medium">
                                  {product.category.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-semibold text-gray-900">
                                S/ {Number(product.price).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {product.recipe && product.recipe.ingredients.length > 0 ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                  ✓
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  ✗
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs px-3 py-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                                  onClick={() => openProductModal(product)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs px-3 py-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                  onClick={() => handleDeleteProduct(product)}
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
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-xs px-3 py-2"
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-xs px-3 py-2"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {allFilteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedCategory !== "all" || showOnlyWithRecipe
                    ? "No se encontraron productos con los filtros seleccionados." 
                    : "No hay productos configurados. Crea el primer producto."
                  }
                </p>
                {!searchTerm && selectedCategory === "all" && !showOnlyWithRecipe && (
                  <Button 
                    onClick={() => openProductModal()}
                    className="bg-gray-800 hover:bg-gray-900"
                  >
                    + Crear Primer Producto
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab Productos Eliminados */}
        {activeTab === "deleted" && (
          <>


            <div className="mb-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-800">
                    Productos Eliminados
                  </h3>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>
                      Estos productos han sido eliminados del sistema pero pueden ser recuperados. 
                      Al recuperar un producto, volverá a estar disponible en el menú.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vista de Tabla para Productos Eliminados */}
            {deletedProducts.length > 0 ? (
              <div>
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 font-semibold text-gray-900 text-sm">Producto</th>
                            <th className="text-left p-4 font-semibold text-gray-900 text-sm">Descripción</th>
                            <th className="text-left p-4 font-semibold text-gray-900 text-sm">Categoría</th>
                            <th className="text-center p-4 font-semibold text-gray-900 text-sm">Precio</th>
                            <th className="text-center p-4 font-semibold text-gray-900 text-sm">Estado</th>
                            <th className="text-center p-4 font-semibold text-gray-900 text-sm">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {deletedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-100 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="font-medium text-gray-700">{product.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {product.description || '-'}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span className="text-sm text-gray-600 font-medium">
                                    {categories.find(c => c.id === product.categoryId)?.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="font-semibold text-gray-700">
                                  S/ {Number(product.price).toFixed(2)}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                  🗑️ ELIMINADO
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex justify-center">
                                  <Button 
                                    onClick={() => handleRecoverProduct(product)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    size="sm"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Recuperar
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
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay productos eliminados.</p>
              </div>
            )}
          </>
        )}


      </main>

      {/* Modales */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleModalSave}
        category={editingCategory}
      />

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleModalSave}
        product={editingProduct}
        categories={categories}
      />

      <ConfirmDialog
        isOpen={showRecoverConfirm}
        onClose={() => {
          setShowRecoverConfirm(false)
          setProductToRecover(null)
        }}
        onConfirm={confirmRecoverProduct}
        title="Recuperar Producto"
        description={`¿Estás seguro de que quieres recuperar el producto "${productToRecover?.name}"? El producto volverá a estar disponible en el menú.`}
        confirmText="Recuperar"
        cancelText="Cancelar"
        variant="success"
        isLoading={isRecovering}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setConfirmAction({ type: 'delete-product', item: null, isLoading: false })
        }}
        onConfirm={confirmAction.type === 'delete-product' ? confirmDeleteProduct : confirmDeleteCategory}
        title={confirmAction.type === 'delete-product' ? 'Eliminar Producto' : 'Eliminar Categoría'}
        description={
          confirmAction.type === 'delete-product'
            ? `¿Estás seguro de que quieres eliminar el producto "${(confirmAction.item as Product)?.name}"? Esta acción no se puede deshacer.`
            : `¿Estás seguro de que quieres ELIMINAR COMPLETAMENTE la categoría "${(confirmAction.item as Category)?.name}"? Esta acción NO se puede deshacer y eliminará el registro de la base de datos.`
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={confirmAction.isLoading}
      />

      {/* Modal de confirmación para habilitar/deshabilitar categoría */}
      <ConfirmDialog
        isOpen={showToggleConfirm}
        onClose={() => {
          setShowToggleConfirm(false)
          setConfirmAction({ type: 'delete-product', item: null, isLoading: false })
        }}
        onConfirm={confirmToggleCategory}
        title={`${(confirmAction.item as Category)?.isActive ? 'Deshabilitar' : 'Habilitar'} Categoría`}
        description={`¿Estás seguro de que quieres ${(confirmAction.item as Category)?.isActive ? 'deshabilitar' : 'habilitar'} la categoría "${(confirmAction.item as Category)?.name}"?`}
        confirmText={(confirmAction.item as Category)?.isActive ? 'Deshabilitar' : 'Habilitar'}
        cancelText="Cancelar"
        variant="default"
        isLoading={confirmAction.isLoading}
      />
    </div>
  )
}
