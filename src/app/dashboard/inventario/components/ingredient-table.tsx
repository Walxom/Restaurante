"use client"

import { Ingredient } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Trash2, Package, AlertTriangle, FileX, CheckCircle, Clock } from "lucide-react"

interface IngredientTableProps {
  ingredients: Ingredient[]
  isLoading: boolean
  selectedIngredients: string[]
  toggleSelectIngredient: (id: string) => void
  toggleSelectAll: () => void
  onEdit: (ingredient: Ingredient) => void
  onDelete: (ingredient: Ingredient) => void
  onAdjust: (ingredient: Ingredient) => void
}

export function IngredientTable({
  ingredients,
  isLoading,
  selectedIngredients,
  toggleSelectIngredient,
  toggleSelectAll,
  onEdit,
  onDelete,
  onAdjust
}: IngredientTableProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ok': return { label: 'Stock OK', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', icon: CheckCircle }
      case 'low': return { label: 'Bajo', color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500', icon: AlertTriangle }
      case 'critical': return { label: 'Crítico', color: 'text-rose-500', bg: 'bg-rose-500/10', bar: 'bg-rose-500', icon: AlertTriangle }
      case 'empty': return { label: 'Agotado', color: 'text-muted-foreground', bg: 'bg-white/5', bar: 'bg-muted-foreground/30', icon: FileX }
      default: return { label: '---', color: 'text-muted-foreground', bg: 'bg-white/5', bar: 'bg-muted-foreground/20', icon: Package }
    }
  }

  return (
    <div className={`bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-sm transition-all duration-500 ${isLoading ? 'opacity-50 grayscale' : 'opacity-100'}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-foreground/5 border-b border-border/50">
              <th className="py-4 px-6 text-left w-10">
                <Checkbox 
                  checked={ingredients.length > 0 && selectedIngredients.length === ingredients.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ingrediente</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categoría</th>
              <th className="text-left py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Estado</th>
              <th className="text-center py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stock Actual</th>
              <th className="text-right py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Costo Unit.</th>
              <th className="text-center py-4 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {ingredients.map((ing) => {
              const statusConfig = getStatusConfig(ing.status)
              const StatusIcon = statusConfig.icon

              return (
                <tr key={ing.id} className="group hover:bg-foreground/[0.02] transition-colors duration-300">
                  <td className="py-4 px-6">
                    <Checkbox 
                      checked={selectedIngredients.includes(ing.id)}
                      onCheckedChange={() => toggleSelectIngredient(ing.id)}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center border border-border/50 shadow-inner">
                        <Package className="w-5 h-5 text-primary opacity-50" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-foreground uppercase tracking-widest">{ing.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID: {ing.id.slice(-6)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ing.category?.color || '#ccc' }} />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {ing.category?.name || 'SIN CATEGORÍA'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.color} border border-current/10`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{statusConfig.label}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-black tracking-tighter ${statusConfig.color}`}>
                          {ing.currentStock}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{ing.unit}</span>
                      </div>
                      <div className="w-16 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${statusConfig.bar} transition-all duration-1000 relative`}
                          style={{ width: `${Math.min(100, (ing.currentStock / (ing.maxStock || ing.minStock * 2)) * 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-[11px] font-black text-foreground tracking-widest">
                      {ing.cost ? `S/ ${ing.cost.toFixed(2)}` : '---'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2 transition-all duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdjust(ing)}
                        className="h-9 w-9 rounded-xl p-0 text-amber-500 bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/30 hover:scale-110 active:scale-95 transition-all"
                        title="Ajustar Stock"
                      >
                        <Clock className="w-[18px] h-[18px]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(ing)}
                        className="h-9 w-9 rounded-xl p-0 text-primary bg-primary/5 border border-primary/10 hover:bg-primary/20 hover:border-primary/30 hover:scale-110 active:scale-95 transition-all"
                        title="Editar"
                      >
                        <Edit className="w-[18px] h-[18px]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(ing)}
                        className="h-9 w-9 rounded-xl p-0 text-rose-500 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/30 hover:scale-110 active:scale-95 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-[18px] h-[18px]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
