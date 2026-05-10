"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Layers, ArrowRight, Info, AlertTriangle, CheckCircle, FileX, Plus, Minus, Hash, Package } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  status: string
  statusText: string
  category?: {
    name: string
    color: string
  }
}

interface BulkStockAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedIngredients: Ingredient[]) => void
  ingredients: Ingredient[]
}

export default function BulkStockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  ingredients
}: BulkStockAdjustModalProps) {
  const [action, setAction] = useState<"add" | "subtract" | "set">("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setAction("add")
      setQuantity("")
      setReason("")
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!quantity || isNaN(Number(quantity))) {
      newErrors.quantity = "Ingrese un valor numérico"
      setErrors(newErrors)
      return false
    }
    const numQuantity = Number(quantity)
    if ((action === "add" || action === "subtract") && numQuantity <= 0) {
      newErrors.quantity = "La cantidad debe ser mayor a 0"
    }
    if (action === "set" && numQuantity < 0) {
      newErrors.quantity = "El stock no puede ser negativo"
    }
    if (action === "subtract") {
      const hasInsufficientStock = ingredients.some(ing => numQuantity > ing.currentStock)
      if (hasInsufficientStock) {
        const minStock = Math.min(...ingredients.map(ing => ing.currentStock))
        newErrors.quantity = `Máximo reducible: ${minStock} unidades`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateNewStock = (ingredient: Ingredient, qty: number) => {
    switch (action) {
      case "add": return ingredient.currentStock + qty
      case "subtract": return Math.max(0, ingredient.currentStock - qty)
      case "set": return qty
      default: return ingredient.currentStock
    }
  }

  const getStatusInfo = (stock: number, minStock: number) => {
    const percentage = stock / minStock
    if (stock === 0) return { text: "Agotado", color: "text-rose-400", bg: "bg-rose-500/10", icon: FileX }
    if (percentage <= 0.2) return { text: "Crítico", color: "text-rose-500", bg: "bg-rose-500/10", icon: AlertTriangle }
    if (percentage <= 1) return { text: "Bajo", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertTriangle }
    return { text: "Óptimo", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const qty = Number(quantity)
      const ingredientIds = ingredients.map(ing => ing.id)
      const response = await fetch('/api/ingredients/bulk-stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientIds, action, quantity: qty, reason: reason || null })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación masiva')
      }
      const data = await response.json()
      onSuccess(data.ingredients)
      onClose()
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Error de conexión" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || ingredients.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Ajuste Masivo</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sincronización de {ingredients.length} insumos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {/* ACCIÓN SELECTOR */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Modo de Operación</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'add', label: 'Reposición', icon: Plus, color: 'text-emerald-500' },
                { id: 'subtract', label: 'Consumo', icon: Minus, color: 'text-rose-500' },
                { id: 'set', label: 'Inventario', icon: Hash, color: 'text-blue-500' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAction(opt.id as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                    action === opt.id 
                      ? `bg-foreground/[0.05] border-foreground/20 shadow-lg` 
                      : 'bg-transparent border-border/50 hover:border-foreground/20 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <opt.icon className={`w-4 h-4 ${action === opt.id ? opt.color : 'text-foreground'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* INPUT CANTIDAD */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {action === 'set' ? 'Cantidad Final (General)' : 'Cantidad a Ajustar (General)'}
              </label>
            </div>
            <div className="relative group">
              <Input
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="h-14 bg-foreground/[0.03] border-border/50 rounded-2xl px-6 text-sm font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              {errors.quantity && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">{errors.quantity}</p>}
            </div>
          </div>

          {/* LISTA DE INGREDIENTES */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Vista Previa de Impacto</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {ingredients.map((ing) => {
                const qty = quantity && !isNaN(Number(quantity)) ? Number(quantity) : 0
                const newStock = calculateNewStock(ing, qty)
                const status = getStatusInfo(newStock, ing.minStock)
                
                return (
                  <div key={ing.id} className="p-3 rounded-2xl bg-foreground/[0.02] border border-border/30 flex flex-col gap-2 transition-all hover:bg-foreground/[0.04]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{ing.name}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full ${status.bg} ${status.color} border border-current/10 text-[7px] font-black uppercase tracking-tighter`}>
                        {status.text}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="text-muted-foreground/40">{ing.currentStock}</span>
                      <ArrowRight className="w-2 h-2 text-muted-foreground/20" />
                      <span className={`${status.color} font-black`}>{newStock} <span className="text-[8px] opacity-60 font-bold">{ing.unit}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RAZÓN */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Justificación Técnica</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="EJ: REPOSICIÓN SEMANAL / INVENTARIO..."
              className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* ERROR SUBMIT */}
          {errors.submit && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <Info className="w-4 h-4 text-rose-500" />
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{errors.submit}</p>
            </div>
          )}

          {/* FOOTER ACCIONES */}
          <div className="flex gap-4 pt-4 pb-2">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-foreground/5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !quantity}
              className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl shadow-black/10"
            >
              {isSubmitting ? "Sincronizando..." : "Sincronizar Lote"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}