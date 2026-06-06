"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Package, Ruler, TrendingUp, DollarSign, ChevronRight, Info, Save, Layers, Scale, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  UNIT_CATEGORIES, 
  getUnitsByCategory, 
  suggestUnitCategory,
  INGREDIENT_TYPE_SUGGESTIONS 
} from "@/features/inventory/utils/units"
import { type Ingredient, type IngredientCategory } from "@/types"
import { ModalShell } from "@/components/ui/modal-shell"
import { SectionTitle } from "@/components/ui/section-title"
import { PremiumInput } from "@/components/ui/premium-input"

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

  // Refs para auto-focus en errores
  const nameRef = useRef<HTMLInputElement>(null)
  const currentStockRef = useRef<HTMLInputElement>(null)
  const minStockRef = useRef<HTMLInputElement>(null)

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
    
    // Validar Stock Actual (Permitir 0)
    if (formData.currentStock === "" || isNaN(Number(formData.currentStock))) {
      newErrors.currentStock = "Inválido"
    } else if (Number(formData.currentStock) < 0) {
      newErrors.currentStock = "No puede ser negativo"
    }

    // Validar Stock Mínimo (Permitir 0)
    if (formData.minStock === "" || isNaN(Number(formData.minStock))) {
      newErrors.minStock = "Inválido"
    } else if (Number(formData.minStock) < 0) {
      newErrors.minStock = "No puede ser negativo"
    }

    // Validar campos opcionales si tienen valor
    if (formData.maxStock !== "" && isNaN(Number(formData.maxStock))) {
      newErrors.maxStock = "Debe ser un número"
    }
    
    if (formData.cost !== "" && isNaN(Number(formData.cost))) {
      newErrors.cost = "Debe ser un número"
    } else if (formData.cost !== "" && Number(formData.cost) < 0) {
      newErrors.cost = "No puede ser negativo"
    }
    
    setErrors(newErrors)
    // Adjuntar los errores a la función para acceso inmediato en handleSubmit
    ;(validateForm as any).getLatestErrors = () => newErrors
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()
    
    if (!validateForm()) {
      // Auto-focus en el primer error encontrado
      const newErrors = (validateForm as any).getLatestErrors?.() || {}
      if (newErrors.name) nameRef.current?.focus()
      else if (newErrors.currentStock) currentStockRef.current?.focus()
      else if (newErrors.minStock) minStockRef.current?.focus()
      
      return
    }
    
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

  const modalFooter = (
    <div className="flex gap-4">
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
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={ingredient ? Save : Package}
      title={ingredient ? "Ficha Técnica" : "Nuevo Registro"}
      subtitle={ingredient ? `Editando: ${ingredient.name}` : "Configuración de insumo base"}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-12">
        
        {/* SECCIÓN 1: IDENTIFICACIÓN */}
        <section>
          <SectionTitle icon={Layers} title="Identificación" subtitle="Información principal del recurso" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PremiumInput
              ref={nameRef}
              label="Nombre del Insumo"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="EJ: COCA COLA 500ML"
              error={errors.name}
            />
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
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || undefined }} />
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
            <PremiumInput
              ref={currentStockRef}
              type="number" step="0.1"
              label="Stock Actual"
              value={formData.currentStock}
              onChange={(e) => handleInputChange("currentStock", e.target.value)}
              error={errors.currentStock}
            />
            <PremiumInput
              ref={minStockRef}
              type="number" step="0.1"
              label="Mínimo"
              value={formData.minStock}
              onChange={(e) => handleInputChange("minStock", e.target.value)}
              error={errors.minStock}
            />
            <PremiumInput
              type="number" step="0.1"
              label="Máximo Opt."
              value={formData.maxStock}
              onChange={(e) => handleInputChange("maxStock", e.target.value)}
              error={errors.maxStock}
            />
          </div>
        </section>

        {/* SECCIÓN 4: COSTOS */}
        <section>
          <SectionTitle icon={DollarSign} title="Finanzas" subtitle="Valoración y costos de adquisición" />
          <div className="max-w-xs">
            <PremiumInput
              type="number" step="0.01"
              label="Costo Unitario (S/)"
              icon={DollarSign}
              value={formData.cost}
              onChange={(e) => handleInputChange("cost", e.target.value)}
              error={errors.cost}
              placeholder="0.00"
            />
          </div>
        </section>

        {errors.submit && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errors.submit}</p>
          </div>
        )}

      </form>
    </ModalShell>
  )
}
