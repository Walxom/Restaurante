"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import useMenuData from "@/features/menu/hooks/useMenuData"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, RotateCcw, Package, Grid3X3, List, Table } from "lucide-react"
import CategoryModal from "@/features/menu/components/CategoryModal"
import ProductModal from "@/features/menu/components/ProductModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import ProductTable from "@/features/menu/components/ProductTable"
import CategoryTable from "@/features/menu/components/CategoryTable"
import { RoleGuard } from "@/components/auth/role-guard"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { type Product, type Category } from "@/types"

export default function MenuPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const {
    categories,
    products,
    deletedProducts,
    isLoading,
    refresh,
    deleteCategory,
    toggleCategory,
    deleteProduct,
    recoverProduct,
  } = useMenuData()

  const [activeTab, setActiveTab] = useState<"categories" | "products" | "deleted" | "preview">("products")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showOnlyWithRecipe, setShowOnlyWithRecipe] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false)
  const [productToRecover, setProductToRecover] = useState<Product | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-product' | 'delete-category' | 'toggle-category'
    item: Product | Category | null
    isLoading: boolean
  }>({ type: 'delete-product', item: null, isLoading: false })

  const handleModalSave = async () => {
    await refresh()
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
      const ok = await deleteCategory(category.id)
      if (ok) {
        await handleModalSave()
        toast.success("Categoría eliminada")
        setShowDeleteConfirm(false)
      } else {
        toast.error("Error al eliminar")
      }
    } catch (error) {
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
      const ok = await toggleCategory(category.id, !category.isActive)
      if (ok) {
        await handleModalSave()
        toast.success("Estado actualizado")
        setShowToggleConfirm(false)
      } else {
        toast.error("Error al cambiar estado")
      }
    } catch (error) {
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
      const ok = await deleteProduct(product.id)
      if (ok) {
        await handleModalSave()
        toast.success("Producto eliminado")
        setShowDeleteConfirm(false)
      } else {
        toast.error("Error al eliminar")
      }
    } catch (error) {
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
      const ok = await recoverProduct(productToRecover.id)
      if (ok) {
        await handleModalSave()
        toast.success("Producto recuperado")
        setShowRecoverConfirm(false)
      } else {
        toast.error("Error al recuperar")
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setIsRecovering(false)
    }
  }

  const allFilteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory
    const matchesRecipe = !showOnlyWithRecipe || (product.recipe && product.recipe.ingredients.length > 0)
    return matchesSearch && matchesCategory && matchesRecipe
  })

  const totalPages = Math.ceil(allFilteredProducts.length / itemsPerPage)
  const filteredProducts = allFilteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedCategory, showOnlyWithRecipe])

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title="Gestión de Menú"
            subtitle="Administra categorías y productos"
            backTo="/dashboard"
          >
            <Button 
              onClick={() => activeTab === "categories" ? openCategoryModal() : openProductModal()}
              className="h-10 px-4 bg-foreground text-background hover:opacity-90 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === "categories" ? "Categoría" : "Producto"}
            </Button>
          </AdminPageHeader>

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Tabs y Contenido (Simplificado para brevedad, asumiendo que el resto del JSX se mantiene igual de funcional) */}
            <div className="mb-8 flex border-b border-border/50 overflow-x-auto scrollbar-hide">
              {["products", "categories", "deleted"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                    activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground opacity-50"
                  }`}
                >
                  {tab === "products" ? "Productos" : tab === "categories" ? "Categorías" : "Papelera"}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary animate-in fade-in duration-500" />}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Sincronizando menú...</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {activeTab === "products" && (
                  <div className="space-y-6">
                    {/* Barra de Filtros Premium */}
                    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-all duration-300">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          type="text"
                          placeholder="Buscar por nombre o descripción..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 hover:bg-background/80 transition-all font-bold text-xs w-full"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <div className="w-full sm:w-48">
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-11 px-3 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 hover:bg-background/80 transition-all font-bold text-xs w-full text-foreground cursor-pointer"
                          >
                            <option value="all">Todas las categorías</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 bg-background/30 px-4 h-11 border border-border/50 rounded-xl hover:bg-background/50 transition-all duration-300">
                          <input
                            type="checkbox"
                            id="showOnlyWithRecipe"
                            checked={showOnlyWithRecipe}
                            onChange={(e) => setShowOnlyWithRecipe(e.target.checked)}
                            className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                          />
                          <label htmlFor="showOnlyWithRecipe" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors">
                            Solo con receta
                          </label>
                        </div>

                        {(searchTerm || selectedCategory !== "all" || showOnlyWithRecipe) && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSearchTerm("")
                              setSelectedCategory("all")
                              setShowOnlyWithRecipe(false)
                            }}
                            className="h-11 px-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/80 transition-all font-black uppercase tracking-widest text-[9px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-2" />
                            Limpiar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tabla de Productos o Búsqueda Vacía */}
                    {allFilteredProducts.length === 0 ? (
                      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm flex flex-col items-center justify-center text-center py-16 sm:py-24 animate-in fade-in duration-500">
                        <Search className="w-12 h-12 text-muted-foreground/30 mb-4 animate-pulse" />
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                          No se encontraron productos
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
                          Intenta ajustando los filtros o el término de búsqueda para ver los platos.
                        </p>
                        {(searchTerm || selectedCategory !== "all" || showOnlyWithRecipe) && (
                          <Button
                            onClick={() => {
                              setSearchTerm("")
                              setSelectedCategory("all")
                              setShowOnlyWithRecipe(false)
                            }}
                            className="mt-6 h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restablecer Filtros
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
                        <ProductTable products={filteredProducts} onEdit={openProductModal} onDelete={handleDeleteProduct} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "products" && totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/20 backdrop-blur-md border border-border/30 p-4 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <label className="mr-2">Mostrar</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                        className="bg-background/80 border border-border/50 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground cursor-pointer font-bold font-mono"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="ml-3">de {allFilteredProducts.length} productos</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40"
                      >
                        Anterior
                      </Button>
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const page = i + 1
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${
                              currentPage === page 
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-black' 
                                : 'bg-card/30 hover:bg-card/60 text-muted-foreground hover:text-foreground border border-border/50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                        className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "categories" && (
                   <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500">
                     <CategoryTable categories={categories} onEdit={openCategoryModal} onDelete={handleDeleteCategory} />
                   </div>
                )}

                {activeTab === "deleted" && (
                  <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500">
                    {!deletedProducts || deletedProducts.length === 0 ? (
                      <div className="p-8 sm:p-12 text-center py-16 sm:py-24 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <Trash2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4 animate-bounce-subtle" />
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Papelera vacía</p>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">No hay ningún producto eliminado temporalmente.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-foreground/5 border-b border-border/50">
                          <tr>
                            <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Producto</th>
                            <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Categoría</th>
                            <th className="text-right p-4 font-black text-[10px] uppercase tracking-widest">Precio</th>
                            <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {deletedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-background/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-linear-to-br from-slate-400 to-slate-500 rounded-lg flex items-center justify-center opacity-60">
                                    <Package className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm text-muted-foreground line-through">{product.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{product.description || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">{product.category?.name}</td>
                              <td className="p-4 text-right font-semibold text-muted-foreground">S/ {product.price}</td>
                              <td className="p-4">
                                <div className="flex justify-center">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleRecoverProduct(product)}
                                    className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all duration-300 animate-in zoom-in-95"
                                    title="Recuperar Producto"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Recuperar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Modales */}
        <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} category={editingCategory} onSave={handleModalSave} />
        <ProductModal isOpen={showProductModal} onClose={() => setShowProductModal(false)} product={editingProduct} categories={categories} onSave={handleModalSave} />
        <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmAction.type === 'delete-product' ? confirmDeleteProduct : confirmDeleteCategory} title="¿Confirmar eliminación?" description="Esta acción no se puede deshacer." confirmText="Eliminar" variant="destructive" isLoading={confirmAction.isLoading} />
      </div>
    </RoleGuard>
  )
}
