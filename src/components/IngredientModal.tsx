"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Package, Ruler, TrendingUp, DollarSign, ChevronRight, Info, Save, Layers, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  UNIT_CATEGORIES, 
  getUnitsByCategory, 
  suggestUnitCategory,
  INGREDIENT_TYPE_SUGGESTIONS 
} from "@/lib/ingredientUnits"

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
}

interface IngredientCategory {
  id: string
  name: string
  description?: string
  color?: string
}

interface IngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ingredient?: Ingredient | null
}

export default function IngredientModal({
  isOpen,
  onClose,
  onSuccess,
  ingredient
}: IngredientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    unitCategory: "",
    currentStock: "",
    minStock: "",
    maxStock: "",
    cost: "",
    categoryId: ""
  })
  const [selectedUnitCategory, setSelectedUnitCategory] = useState<string>("")
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        unitCategory: ingredient.unitCategory || "",
        currentStock: ingredient.currentStock.toString(),
        minStock: ingredient.minStock.toString(),
        maxStock: ingredient.maxStock?.toString() || "",
        cost: ingredient.cost?.toString() || "",
        categoryId: ingredient.categoryId || ""
      })
      
      const savedCategory = ingredient.unitCategory
      if (savedCategory) {
        setSelectedUnitCategory(savedCategory)
      } else {
        const unitCategory = UNIT_CATEGORIES.find(cat => 
          cat.units.some(unit => unit.value === ingredient.unit)
        )
        setSelectedUnitCategory(unitCategory?.id || "")
      }
    } else {
      setFormData({
        name: "", unit: "", unitCategory: "", currentStock: "",
        minStock: "", maxStock: "", cost: "", categoryId: ""
      })
      setSelectedUnitCategory("")
    }
    setErrors({})
  }, [ingredient, isOpen])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/ingredient-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {}
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Requerido"
    if (!formData.unit.trim()) newErrors.unit = "Requerido"
    if (!formData.currentStock || isNaN(Number(formData.currentStock))) newErrors.currentStock = "Inválido"
    if (!formData.minStock || isNaN(Number(formData.minStock))) newErrors.minStock = "Inválido"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        unitCategory: formData.unitCategory || null,
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        maxStock: formData.maxStock ? Number(formData.maxStock) : null,
        cost: formData.cost ? Number(formData.cost) : null,
        categoryId: formData.categoryId || null
      }
      const url = ingredient ? `/api/ingredients/${ingredient.id}` : "/api/ingredients"
      const method = ingredient ? "PATCH" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        setErrors({ submit: error.error || "Error al guardar" })
      }
    } catch (error) {
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === "name" && value.trim() && !selectedUnitCategory) {
      const suggestedCategory = suggestUnitCategory(value)
      if (suggestedCategory) handleUnitCategoryChange(suggestedCategory)
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }))
  }

  const handleUnitCategoryChange = (categoryId: string) => {
    setSelectedUnitCategory(categoryId)
    const categoryUnits = getUnitsByCategory(categoryId)
    if (categoryUnits.length > 0) {
      setFormData(prev => ({ ...prev, unit: categoryUnits[0].value, unitCategory: categoryId }))
    }
  }

  if (!isOpen) return null

  const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] leading-none mb-1">{title}</h4>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 leading-none">{subtitle}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 text-primary">
              {ingredient ? <Save className="w-6 h-6" /> : <Package className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">
                {ingredient ? "Ficha Técnica" : "Nuevo Registro"}
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {ingredient ? `Editando: ${ingredient.name}` : "Configuración de insumo base"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-12">
            
            {/* SECCIÓN 1: IDENTIFICACIÓN */}
            <section>
              <SectionTitle icon={Layers} title="Identificación" subtitle="Información principal del recurso" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre del Insumo</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="EJ: COCA COLA 500ML"
                    className={cn(
                      "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
                      errors.name && "border-rose-500/50 bg-rose-500/5"
                    )}
                  />
                  {errors.name && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">Requerido</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Categoría Operativa</label>
                  <Select 
                    value={formData.categoryId || "no-category"} 
                    onValueChange={(v) => handleInputChange("categoryId", v === "no-category" ? "" : v)}
                  >
                    <SelectTrigger className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest">
                      <SelectValue placeholder="SIN CATEGORÍA" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-2xl">
                      <SelectItem value="no-category" className="text-[10px] font-black uppercase tracking-widest">Sin categoría</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: UNIDAD DE MEDIDA */}
            <section>
              <SectionTitle icon={Scale} title="Medición" subtitle="Configuración de métricas y envases" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Sistema de Medida</label>
                  <Select value={selectedUnitCategory} onValueChange={handleUnitCategoryChange}>
                    <SelectTrigger className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest">
                      <SelectValue placeholder="SELECCIONAR TIPO" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-2xl">
                      {UNIT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase tracking-widest">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Unidad Base</label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(v) => handleInputChange("unit", v)}
                    disabled={!selectedUnitCategory}
                  >
                    <SelectTrigger className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest disabled:opacity-30">
                      <SelectValue placeholder="SELECCIONAR UNIDAD" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-2xl">
                      {selectedUnitCategory && getUnitsByCategory(selectedUnitCategory).map(u => (
                        <SelectItem key={u.value} value={u.value} className="text-[10px] font-black uppercase tracking-widest">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedUnitCategory && (
                <div className="mt-4 flex flex-wrap gap-1.5 ml-1">
                  {INGREDIENT_TYPE_SUGGESTIONS[selectedUnitCategory as keyof typeof INGREDIENT_TYPE_SUGGESTIONS]
                    ?.slice(0, 5).map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10 text-[8px] font-black uppercase tracking-tighter text-primary/60">
                        {s}
                      </span>
                    ))}
                </div>
              )}
            </section>

            {/* SECCIÓN 3: CONTROL DE EXISTENCIAS */}
            <section>
              <SectionTitle icon={TrendingUp} title="Logística" subtitle="Niveles de stock y alertas" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Stock Actual</label>
                  <Input
                    type="number" step="0.1"
                    value={formData.currentStock}
                    onChange={(e) => handleInputChange("currentStock", e.target.value)}
                    className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                    Mínimo <Info className="w-2.5 h-2.5 opacity-50" />
                  </label>
                  <Input
                    type="number" step="0.1"
                    value={formData.minStock}
                    onChange={(e) => handleInputChange("minStock", e.target.value)}
                    className="h-12 bg-rose-500/[0.03] border-rose-500/20 rounded-2xl px-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Máximo Opt.</label>
                  <Input
                    type="number" step="0.1"
                    value={formData.maxStock}
                    onChange={(e) => handleInputChange("maxStock", e.target.value)}
                    className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: COSTOS */}
            <section>
              <SectionTitle icon={DollarSign} title="Finanzas" subtitle="Valoración y costos de adquisición" />
              <div className="max-w-xs space-y-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Costo Unitario (S/)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  <Input
                    type="number" step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleInputChange("cost", e.target.value)}
                    className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl pl-10 pr-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </section>

          </div>
        </form>

        {/* FOOTER */}
        <div className="p-8 border-t border-border/50 bg-foreground/[0.02] flex gap-4">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-foreground/5 transition-all"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl shadow-black/10 transition-all active:scale-95"
          >
            {isSubmitting ? "Guardando Cambios..." : (ingredient ? "Actualizar Insumo" : "Crear Ingrediente")}
          </Button>
        </div>
      </div>
    </div>
  )
}
