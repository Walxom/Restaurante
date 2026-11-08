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
  Layers,
  History,
  LayoutDashboard
} from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"

// Hooks
import { useInventory } from "@/features/inventory/hooks/useInventory"
import { useInventoryCategories } from "@/features/inventory/hooks/useInventoryCategories"
import { useInventoryAlerts } from "@/features/inventory/hooks/useInventoryAlerts"
import { type Ingredient, type IngredientCategory } from "@/types"

// Components
import { InventoryStats } from "./components/inventory-stats"
import { InventoryFilters } from "./components/inventory-filters"
import { IngredientTable } from "./components/ingredient-table"
import { CategoryTable } from "./components/category-table"
import { RoleGuard } from "@/components/auth/role-guard"

// Modals (Existing)
import IngredientModal from "@/features/inventory/components/IngredientModal"
import StockAdjustModal from "@/features/inventory/components/StockAdjustModal"
import BulkStockAdjustModal from "@/features/inventory/components/BulkStockAdjustModal"
import IngredientCategoryModal from "@/features/inventory/components/IngredientCategoryModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import { toast } from "react-hot-toast"

export default function InventoryPage() {
  const router = useRouter()
  
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

  const handleSuccess = () => {
    refreshInventory()
    refreshCategories()
    refreshAlerts()
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    try {
      if (itemToDelete.type === 'ingredient') {
        const response = await fetch(`/api/ingredients/${itemToDelete.id}`, { method: 'DELETE' })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al eliminar ingrediente')
        }
      } else {
        const response = await fetch(`/api/ingredients/categories/${itemToDelete.id}`, { method: 'DELETE' })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al eliminar categoría')
        }
      }
      
      handleSuccess()
      setShowDeleteModal(false)
      toast.success('Eliminado correctamente')
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title="Inventario Maestro"
            subtitle="Gestión de insumos y almacén"
            backTo="/dashboard"
          >
            <Button
              onClick={() => { setSelectedIngredient(null); setShowIngredientModal(true) }}
              className="h-10 px-4 bg-foreground text-background hover:opacity-90 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-black/5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Insumo
            </Button>
          </AdminPageHeader>

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Estadísticas de Inventario */}
            <InventoryStats 
              stats={alertStats} 
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <TabsList className="bg-muted/50 backdrop-blur-sm p-1 rounded-2xl border border-border/50 h-12 w-full sm:w-auto overflow-x-auto custom-scrollbar">
                  <TabsTrigger value="inventory" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    <Package className="w-4 h-4 mr-2" />
                    Existencias
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    <Layers className="w-4 h-4 mr-2" />
                    Categorías
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    <History className="w-4 h-4 mr-2" />
                    Papelera
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'categories' && (
                  <Button 
                    onClick={() => {
                      setSelectedCategory(null)
                      setShowCategoryModal(true)
                    }}
                    variant="outline"
                    className="h-10 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm font-black uppercase tracking-widest text-[10px] hover:bg-muted whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Categoría
                  </Button>
                )}
              </div>

              <TabsContent value="inventory" className="m-0 focus-visible:ring-0 space-y-6">
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
                  onEdit={handleEditIngredient}
                  onAdjust={handleAdjustStock}
                  onDelete={(ing) => handleDeleteItem(ing.id, 'ingredient')}
                  selectedIngredients={selectedIngredients}
                  toggleSelectIngredient={toggleSelectIngredient}
                  toggleSelectAll={toggleSelectAll}
                />
              </TabsContent>

              <TabsContent value="categories" className="m-0 focus-visible:ring-0">
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

              <TabsContent value="deleted" className="m-0 focus-visible:ring-0">
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-1">Historial de Eliminación</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 max-w-[280px]">
                    Los elementos eliminados recientemente aparecerán aquí para su restauración técnica.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>

        {/* Panel de Acciones Masivas Flotante */}
        {selectedIngredients.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-foreground text-background px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-lg">
              <div className="flex items-center gap-3 pr-6 border-r border-background/20">
                <div className="h-8 w-8 rounded-full bg-background/20 flex items-center justify-center text-[11px] font-black">
                  {selectedIngredients.length}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Seleccionados</span>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  size="sm" 
                  onClick={() => setShowBulkModal(true)}
                  className="bg-background text-foreground hover:bg-background/90 rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]"
                >
                  Ajuste Masivo
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleSelectAll()}
                  className="text-background/60 hover:text-background hover:bg-background/10 rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modales */}
        <IngredientModal 
          isOpen={showIngredientModal}
          onClose={() => {
            setShowIngredientModal(false)
            setSelectedIngredient(null)
          }}
          onSuccess={handleSuccess}
          ingredient={selectedIngredient}
        />

        <StockAdjustModal 
          isOpen={showStockModal}
          onClose={() => {
            setShowStockModal(false)
            setSelectedIngredient(null)
          }}
          onSuccess={handleSuccess}
          ingredient={selectedIngredient}
        />

        {showBulkModal && (
          <BulkStockAdjustModal 
            isOpen={showBulkModal}
            onClose={() => {
              setShowBulkModal(false)
              toggleSelectAll()
            }}
            ingredients={allIngredients.filter(ing => selectedIngredients.includes(ing.id))}
            onSuccess={handleSuccess}
          />
        )}

        <IngredientCategoryModal 
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false)
            setSelectedCategory(null)
          }}
          onSuccess={handleSuccess}
          category={selectedCategory}
        />

        <ConfirmDialog 
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title={`Eliminar ${itemToDelete?.type === 'category' ? 'Categoría' : 'Ingrediente'}`}
          description="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer si el elemento está en uso."
          confirmText="Eliminar Definitivamente"
          variant="destructive"
        />
      </div>
    </RoleGuard>
  )
}
