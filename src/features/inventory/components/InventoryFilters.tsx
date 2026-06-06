"use client"

import { Search, Filter, ChevronDown, RotateCcw } from "lucide-react"
import { type IngredientCategory } from "@/types"

interface InventoryFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  stockFilter: string
  setStockFilter: (filter: string) => void
  categoryFilter: string
  setCategoryFilter: (filter: string) => void
  categories: IngredientCategory[]
}

export function InventoryFilters({
  searchTerm,
  setSearchTerm,
  stockFilter,
  setStockFilter,
  categoryFilter,
  setCategoryFilter,
  categories
}: InventoryFiltersProps) {

  const stockOptions = [
    { id: 'all', label: 'Todos los niveles' },
    { id: 'low', label: 'Stock Bajo' },
    { id: 'critical', label: 'Stock Crítico' },
    { id: 'empty', label: 'Agotados' }
  ]

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 mb-8 space-y-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Búsqueda */}
        <div className="flex-1 space-y-3">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Búsqueda Técnica</span>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR INGREDIENTE O INSUMO..."
              className="w-full h-12 bg-background/50 border border-border/50 rounded-2xl pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado de Stock</span>
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-3 pr-10 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {stockOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Categoría</span>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-3 pr-10 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all min-w-[160px]"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex items-end pb-0.5">
            <button
              onClick={() => {
                setSearchTerm("")
                setStockFilter("all")
                setCategoryFilter("all")
              }}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-foreground/5 border border-border/50 hover:bg-foreground/10 transition-all text-muted-foreground hover:text-foreground"
              title="Resetear filtros"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
