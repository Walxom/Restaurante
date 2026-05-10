"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  AlertTriangle, 
  FolderOpen, 
  Plus, 
  ArrowLeft, 
  Layers,
  History,
  LayoutDashboard
} from "lucide-react"

// Hooks
import { useInventory, Ingredient } from "@/hooks/useInventory"
import { useInventoryCategories, IngredientCategory } from "@/hooks/useInventoryCategories"
import { useInventoryAlerts } from "@/hooks/useInventoryAlerts"

// Components
import { InventoryStats } from "./components/inventory-stats"
import { InventoryFilters } from "./components/inventory-filters"
import { IngredientTable } from "./components/ingredient-table"
import { CategoryTable } from "./components/category-table"

// Modals (Existing)
import IngredientModal from "@/components/IngredientModal"
import StockAdjustModal from "@/components/StockAdjustModal"
import BulkStockAdjustModal from "@/components/BulkStockAdjustModal"
import IngredientCategoryModal from "@/components/IngredientCategoryModal"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"

export default function InventoryPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Data Logic
  const {
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
    currentPage,
    setCurrentPage,
    selectedIngredients,
    toggleSelectIngredient,
    toggleSelectAll,
    allDeletedIngredients,
    refresh: refreshInventory
  } = useInventory()

  const {
    categories,
    isLoading: isCategoriesLoading,
    refresh: refreshCategories,
    deleteCategory
  } = useInventoryCategories()

  const {
    alertStats,
    refresh: refreshAlerts
  } = useInventoryAlerts()

  // Modal States
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'deleted'>('inventory')
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'ingredient' | 'category' } | null>(null)

  // Actions
  const handleEditIngredient = (ing: Ingredient) => {
    setSelectedIngredient(ing)
    setShowIngredientModal(true)
  }

  const handleAdjustStock = (ing: Ingredient) => {
    setSelectedIngredient(ing)
    setShowStockModal(true)
  }

  const handleDeleteItem = (id: string, type: 'ingredient' | 'category') => {
    setItemToDelete({ id, type })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    if (itemToDelete.type === 'category') {
      const result = await deleteCategory(itemToDelete.id)
      if (result.success) {
        setShowDeleteModal(false)
      } else {
        alert(result.error)
      }
    } else {
      // Ingredient delete logic
      try {
        const response = await fetch(`/api/ingredients/${itemToDelete.id}`, { method: 'DELETE' })
        if (response.ok) {
          refreshInventory()
          refreshAlerts()
          setShowDeleteModal(false)
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  const handleSuccess = () => {
    refreshInventory()
    refreshCategories()
    refreshAlerts()
  }

  if (session?.user.role !== "JEFE") {
    return null
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground selection:bg-primary/30">
      {/* DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#050505]/60 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              onClick={() => router.push("/dashboard")} 
              variant="ghost"
              className="group h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all p-0"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div>
              <h1 className="text-sm font-black text-foreground uppercase tracking-[0.2em] leading-none mb-1">
                Gestión de Inventario
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Control de Insumos y Categorías
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setSelectedIngredient(null)
                setShowIngredientModal(true)
              }}
              className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Insumo
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* KPI STATS */}
        <InventoryStats stats={alertStats} />

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1.5 rounded-2xl h-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger value="inventory" className="flex-1 py-3 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                <Package className="w-3.5 h-3.5 mr-2" />
                Existencias
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 py-3 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                <Layers className="w-3.5 h-3.5 mr-2" />
                Categorías
              </TabsTrigger>
              <TabsTrigger value="deleted" className="flex-1 py-3 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                <History className="w-3.5 h-3.5 mr-2" />
                Papelera
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === 'inventory' && selectedIngredients.length > 0 && (
                <Button
                  onClick={() => setShowBulkModal(true)}
                  className="h-11 px-6 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black uppercase tracking-widest text-[10px] hover:bg-amber-500/20"
                >
                  Ajuste Masivo ({selectedIngredients.length})
                </Button>
              )}
              {activeTab === 'categories' && (
                <Button
                  onClick={() => {
                    setSelectedCategory(null)
                    setShowCategoryModal(true)
                  }}
                  className="h-11 px-6 rounded-xl bg-white/[0.05] border border-white/[0.1] font-black uppercase tracking-widest text-[10px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Categoría
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="inventory" className="mt-0 space-y-6 outline-none">
            <InventoryFilters 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
            />
            
            <IngredientTable 
              ingredients={ingredients}
              isLoading={isLoading}
              selectedIngredients={selectedIngredients}
              toggleSelectIngredient={toggleSelectIngredient}
              toggleSelectAll={toggleSelectAll}
              onEdit={handleEditIngredient}
              onDelete={(ing) => handleDeleteItem(ing.id, 'ingredient')}
              onAdjust={handleAdjustStock}
            />

            {/* PAGINACIÓN */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-4 rounded-3xl">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Página {currentPage} de {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="rounded-xl border-white/[0.05] bg-white/[0.03]"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNextPage}
                    className="rounded-xl border-white/[0.05] bg-white/[0.03]"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-0 outline-none">
            <CategoryTable 
              categories={categories}
              isLoading={isCategoriesLoading}
              onEdit={(cat) => {
                setSelectedCategory(cat)
                setShowCategoryModal(true)
              }}
              onDelete={(cat) => handleDeleteItem(cat.id, 'category')}
            />
          </TabsContent>

          <TabsContent value="deleted" className="mt-0 outline-none">
            <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-12 text-center">
              <History className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Registros Eliminados</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Esta sección se encuentra en mantenimiento...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* PANEL DE ACCIONES MASIVAS (FLOTANTE) */}
      {selectedIngredients.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-foreground text-background px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-8 backdrop-blur-2xl border border-white/10 ring-1 ring-black/5">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Selección Activa</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black leading-none">{selectedIngredients.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Insumos</span>
              </div>
            </div>
            <div className="h-10 w-px bg-background/20" />
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowBulkModal(true)}
                className="bg-background text-foreground hover:bg-background/90 rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
              >
                Ajuste Masivo
              </Button>
              <Button 
                variant="ghost" 
                onClick={toggleSelectAll}
                className="hover:bg-background/10 text-background rounded-2xl h-12 px-6 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showIngredientModal && (
        <IngredientModal 
          isOpen={showIngredientModal}
          onClose={() => {
            setShowIngredientModal(false)
            setSelectedIngredient(null)
          }}
          ingredient={selectedIngredient}
          onSuccess={handleSuccess}
        />
      )}

      {showCategoryModal && (
        <IngredientCategoryModal 
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false)
            setSelectedCategory(null)
          }}
          category={selectedCategory}
          onSuccess={handleSuccess}
        />
      )}

      {showStockModal && selectedIngredient && (
        <StockAdjustModal 
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          ingredient={selectedIngredient}
          onSuccess={handleSuccess}
        />
      )}

      {showBulkModal && (
        <BulkStockAdjustModal 
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false)
            toggleSelectAll() // Clear selection
          }}
          ingredients={allIngredients.filter(ing => selectedIngredients.includes(ing.id))}
          onSuccess={handleSuccess}
        />
      )}

      <ConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Eliminar ${itemToDelete?.type === 'category' ? 'Categoría' : 'Ingrediente'}`}
        description="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer si el elemento está en uso."
        confirmText="Eliminar Definitivamente"
        variant="destructive"
      />
    </div>
  )
}
