"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Search, Clock, UtensilsCrossed, Package } from "lucide-react"
import { Ingredient } from "@/types"
import { getCompatibleUnits, getUnitLabel } from "@/lib/units"
import { cn } from "@/lib/utils"
import { SectionTitle } from "@/components/ui/section-title"

interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: string
}

interface RecipeIngredientSectionProps {
  hasRecipe: boolean
  onToggleRecipe: () => void
  prepTime: string
  onUpdatePrepTime: (value: string) => void
  servings: string
  onUpdateServings: (value: string) => void
  recipeIngredients: RecipeIngredient[]
  availableIngredients: Ingredient[]
  onAddIngredient: () => void
  onRemoveIngredient: (index: number) => void
  onUpdateIngredient: (index: number, field: keyof RecipeIngredient, value: any) => void
  errors: Record<string, string>
}

export function RecipeIngredientSection({
  hasRecipe,
  onToggleRecipe,
  prepTime,
  onUpdatePrepTime,
  servings,
  onUpdateServings,
  recipeIngredients,
  availableIngredients,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredient,
  errors
}: RecipeIngredientSectionProps) {
  const [ingredientSearch, setIngredientSearch] = useState("")

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={UtensilsCrossed} title="Ingeniería" subtitle="Configuración de costos y receta" />
        <div 
          onClick={onToggleRecipe}
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-xl border cursor-pointer transition-all",
            hasRecipe 
              ? "bg-primary/10 border-primary/20 text-primary" 
              : "bg-foreground/5 border-border/50 text-muted-foreground opacity-50"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            hasRecipe ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            {hasRecipe ? "Receta Activada" : "Sin Receta"}
          </span>
        </div>
      </div>

      {hasRecipe && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between p-4 bg-foreground/[0.02] border border-border/50 rounded-2xl">
            <div>
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Ingredientes del Plato</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Los insumos se descontarán al vender</p>
            </div>
            <Button
              type="button"
              onClick={onAddIngredient}
              className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            >
              <Plus className="w-3 h-3 mr-2" />
              Añadir Insumo
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Tiempo Prep. (Min)
              </label>
              <Input
                type="number"
                value={prepTime}
                onChange={(e) => onUpdatePrepTime(e.target.value)}
                className="h-10 bg-foreground/5 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                placeholder="Ej: 15"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                <UtensilsCrossed className="w-2.5 h-2.5" /> Porciones
              </label>
              <Input
                type="number"
                value={servings}
                onChange={(e) => onUpdateServings(e.target.value)}
                className="h-10 bg-foreground/5 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                placeholder="Ej: 1"
              />
            </div>
          </div>

          {errors.ingredients && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest">
              {errors.ingredients}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {recipeIngredients.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center text-muted-foreground/30">
                <Package className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[9px] font-black uppercase tracking-widest">No hay ingredientes vinculados</p>
              </div>
            ) : (
              recipeIngredients.map((item, index) => {
                const selectedIng = availableIngredients.find(ing => ing.id === item.ingredientId)
                const compatibleUnits = selectedIng ? getCompatibleUnits(selectedIng.unit) : []

                return (
                  <div key={index} className="group relative bg-foreground/[0.02] hover:bg-foreground/[0.04] border border-border/50 rounded-2xl p-4 transition-all duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Selección de Insumo */}
                      <div className="sm:col-span-6 space-y-1.5">
                        <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Insumo del Inventario</label>
                        <Select 
                          value={item.ingredientId} 
                          onValueChange={(v) => onUpdateIngredient(index, 'ingredientId', v)}
                        >
                          <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-bold uppercase tracking-widest">
                            <SelectValue placeholder="BUSCAR INSUMO..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-xl max-h-[200px]">
                            <div className="p-2 border-b border-border/50 sticky top-0 bg-popover z-10">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
                                <Input
                                  placeholder="Filtrar..."
                                  value={ingredientSearch}
                                  onChange={(e) => setIngredientSearch(e.target.value)}
                                  className="h-8 pl-8 text-[10px] font-bold uppercase bg-foreground/5 border-none rounded-lg"
                                />
                              </div>
                            </div>
                            {availableIngredients
                              .filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                              .map(ing => (
                                <SelectItem key={ing.id} value={ing.id} className="text-[9px] font-black uppercase tracking-widest">
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span>{ing.name}</span>
                                    <span className="text-[8px] opacity-40 italic">Stock: {ing.currentStock} {getUnitLabel(ing.unit, true)}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cantidad */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Cantidad</label>
                        <Input
                          type="number" step="0.01"
                          value={item.quantity}
                          onChange={(e) => onUpdateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                        />
                      </div>

                      {/* Unidad */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Unidad</label>
                        <Select 
                          value={item.unit} 
                          onValueChange={(v) => onUpdateIngredient(index, 'unit', v)}
                          disabled={!selectedIng}
                        >
                          <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30">
                            <SelectValue placeholder="---" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-xl">
                            {compatibleUnits.map(unit => (
                              <SelectItem key={unit} value={unit} className="text-[9px] font-black uppercase tracking-widest">
                                {getUnitLabel(unit, true)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Eliminar */}
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          onClick={() => onRemoveIngredient(index)}
                          variant="ghost"
                          className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {errors[`ingredient_${index}_id`] && (
                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">Falta seleccionar el insumo</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </section>
  )
}
