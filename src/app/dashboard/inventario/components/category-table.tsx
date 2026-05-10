"use client"

import { IngredientCategory } from "@/hooks/useInventoryCategories"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, FolderOpen, Layers } from "lucide-react"

interface CategoryTableProps {
  categories: IngredientCategory[]
  isLoading: boolean
  onEdit: (category: IngredientCategory) => void
  onDelete: (category: IngredientCategory) => void
}

export function CategoryTable({
  categories,
  isLoading,
  onEdit,
  onDelete
}: CategoryTableProps) {
  
  if (categories.length === 0 && !isLoading) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-10 h-10 text-muted-foreground opacity-20" />
        </div>
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Sin categorías registradas</h3>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Organiza tus insumos creando categorías personalizadas</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${isLoading ? 'opacity-50 grayscale' : 'opacity-100'}`}>
      {categories.map((cat) => (
        <div 
          key={cat.id}
          className="group relative bg-card/40 backdrop-blur-md rounded-[2rem] border border-border/50 p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div 
                className="h-14 w-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"
                style={{ backgroundColor: `${cat.color}20`, borderColor: `${cat.color}40` }}
              >
                <Layers className="w-7 h-7" style={{ color: cat.color }} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{cat.name}</h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID: {cat.id.slice(-6)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(cat)}
                className="h-9 w-9 rounded-xl p-0 text-primary hover:bg-primary/10"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(cat)}
                className="h-9 w-9 rounded-xl p-0 text-rose-500 hover:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {cat.description && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed opacity-60 line-clamp-2 min-h-[30px]">
                {cat.description}
              </p>
            )}
            
            <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border border-border/20">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ingredientes vinculados</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground tracking-tighter">{cat._count?.ingredients || 0}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
