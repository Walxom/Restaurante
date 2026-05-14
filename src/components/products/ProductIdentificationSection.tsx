"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layers, DollarSign } from "lucide-react"
import { Category } from "@/types"
import { cn } from "@/lib/utils"

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
    <section>
      <SectionTitle icon={Layers} title="Identificación" subtitle="Información principal del producto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Comercial</label>
          <Input
            value={name}
            onChange={(e) => onUpdateName(e.target.value.toUpperCase())}
            placeholder="EJ: HAMBURGUESA TRIPLE QUESO"
            className={cn(
              "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
              errors.name && "border-rose-500/50 bg-rose-500/5"
            )}
          />
          {errors.name && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.name}</p>}
        </div>

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

        <div className="space-y-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Precio de Venta (S/)</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <Input
              type="number" step="0.01"
              value={price}
              onChange={(e) => onUpdatePrice(e.target.value)}
              className={cn(
                "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl pl-10 pr-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
                errors.price && "border-rose-500/50 bg-rose-500/5"
              )}
              placeholder="0.00"
            />
          </div>
          {errors.price && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.price}</p>}
        </div>

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
