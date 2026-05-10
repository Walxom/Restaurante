"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Scale, ArrowRight, Info, AlertTriangle, CheckCircle, FileX, Plus, Minus, Hash } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  status: string
  statusText: string
}

interface StockAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ingredient: Ingredient | null
}

export default function StockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  ingredient
}: StockAdjustModalProps) {
  const [action, setAction] = useState<"add" | "subtract" | "set">("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewStock, setPreviewStock] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAction("add")
      setQuantity("")
      setReason("")
      setErrors({})
      setPreviewStock(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (ingredient && quantity && !isNaN(Number(quantity))) {
      const qty = Number(quantity)
      let newStock = ingredient.currentStock

      switch (action) {
        case "add": newStock = ingredient.currentStock + qty; break
        case "subtract": newStock = Math.max(0, ingredient.currentStock - qty); break
        case "set": newStock = qty; break
      }
      setPreviewStock(newStock)
    } else {
      setPreviewStock(null)
    }
  }, [action, quantity, ingredient])

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
    if (action === "subtract" && ingredient && numQuantity > ingredient.currentStock) {
      newErrors.quantity = `Máximo reducible: ${ingredient.currentStock} ${ingredient.unit}`
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredient || !validateForm()) return
    setIsSubmitting(true)
    try {
      const payload = {
        action,
        quantity: Number(quantity),
        reason: reason.trim() || null
      }
      const response = await fetch(`/api/ingredients/${ingredient.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        setErrors({ submit: error.error || "Error en la operación" })
      }
    } catch (error) {
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusInfo = (stock: number) => {
    if (!ingredient) return { text: "---", color: "text-muted-foreground", bg: "bg-white/5", icon: Hash }
    const percentage = stock / ingredient.minStock
    if (stock === 0) return { text: "Agotado", color: "text-rose-400", bg: "bg-rose-500/10", icon: FileX }
    if (percentage <= 0.2) return { text: "Crítico", color: "text-rose-500", bg: "bg-rose-500/10", icon: AlertTriangle }
    if (percentage <= 1) return { text: "Bajo", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertTriangle }
    return { text: "Óptimo", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle }
  }

  if (!isOpen || !ingredient) return null

  const currentStatus = getStatusInfo(ingredient.currentStock)
  const previewStatus = previewStock !== null ? getStatusInfo(previewStock) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col">
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
              <Scale className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Ajuste de Stock</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Operación técnica manual</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* INFO INGREDIENTE */}
          <div className="flex items-center justify-between p-4 rounded-3xl bg-foreground/[0.03] border border-border/50">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Insumo</span>
              <span className="text-[11px] font-black text-foreground uppercase tracking-widest">{ingredient.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Stock Actual</span>
              <span className="text-[11px] font-black text-foreground uppercase tracking-widest">{ingredient.currentStock} {ingredient.unit}</span>
            </div>
          </div>

          {/* ACCIÓN SELECTOR */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Modo de Operación</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'add', label: 'Reposición', icon: Plus, color: 'text-emerald-500', bg: 'data-[state=active]:bg-emerald-500/20' },
                { id: 'subtract', label: 'Consumo', icon: Minus, color: 'text-rose-500', bg: 'data-[state=active]:bg-rose-500/20' },
                { id: 'set', label: 'Inventario', icon: Hash, color: 'text-blue-500', bg: 'data-[state=active]:bg-blue-500/20' }
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
                {action === 'set' ? 'Cantidad Final' : 'Cantidad a Ajustar'}
              </label>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{ingredient.unit}</span>
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

          {/* PREVIEW */}
          {previewStock !== null && previewStatus && (
            <div className="p-5 rounded-3xl bg-foreground/[0.02] border border-border/30 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Resultado Esperado</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${previewStatus.bg} ${previewStatus.color} border border-current/10`}>
                  <previewStatus.icon className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">{previewStatus.text}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-40">{ingredient.currentStock}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-20" />
                <span className={`text-2xl font-black tracking-tighter ${previewStatus.color}`}>{previewStock} <span className="text-xs">{ingredient.unit}</span></span>
              </div>
            </div>
          )}

          {/* RAZÓN */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Justificación Técnica</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="EJ: REPOSICIÓN SEMANAL / DESPERDICIO..."
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
          <div className="flex gap-4 pt-4">
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
              {isSubmitting ? "Sincronizando..." : "Confirmar Ajuste"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
