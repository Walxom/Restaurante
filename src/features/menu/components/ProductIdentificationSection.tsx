"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layers, DollarSign } from "lucide-react"
import { type Category } from "@/types"
import { cn } from "@/lib/utils"
import { SectionTitle } from "@/components/ui/section-title"
import { PremiumInput } from "@/components/ui/premium-input"

interface ProductIdentificationSectionProps {
  name: string
  onUpdateName: (value: string) => void
  categoryId: string
  onUpdateCategory: (value: string) => void
  categories: Category[]
  price: string
  onUpdatePrice: (value: string) => void
  isAvailable: boolean
  onToggleAvailability: () => void
  errors: Record<string, string>
}

export function ProductIdentificationSection({
  name,
  onUpdateName,
  categoryId,
  onUpdateCategory,
  categories,
  price,
  onUpdatePrice,
  isAvailable,
  onToggleAvailability,
  errors
}: ProductIdentificationSectionProps) {
  return (
    <section>
      <SectionTitle icon={Layers} title="Identificación" subtitle="Información principal del producto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <PremiumInput
          label="Nombre Comercial"
          value={name}
          onChange={(e) => onUpdateName(e.target.value.toUpperCase())}
          placeholder="EJ: HAMBURGUESA TRIPLE QUESO"
          error={errors.name}
        />

        <div className="space-y-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Categoría de Menú</label>
          <Select 
            value={categoryId} 
            onValueChange={onUpdateCategory}
          >
            <SelectTrigger className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest">
              <SelectValue placeholder="SELECCIONAR CATEGORÍA" />
            </SelectTrigger>
            <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-2xl">
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase tracking-widest">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.categoryId}</p>}
        </div>

        <PremiumInput
          type="number" step="0.01"
          label="Precio de Venta (S/)"
          icon={DollarSign}
          value={price}
          onChange={(e) => onUpdatePrice(e.target.value)}
          error={errors.price}
          placeholder="0.00"
        />

        <div className="space-y-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Disponibilidad</label>
          <div 
            onClick={onToggleAvailability}
            className={cn(
              "h-12 rounded-2xl border flex items-center px-5 cursor-pointer transition-all gap-3",
              isAvailable 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                : "bg-rose-500/5 border-rose-500/20 text-rose-500"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              isAvailable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAvailable ? "Producto Activo" : "Producto Agotado"}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
