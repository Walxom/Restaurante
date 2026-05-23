"use client"

import { Input } from "@/components/ui/input"
import { Building2, FileText, Phone, MapPin } from "lucide-react"
import { ConfigField } from "./form-utils"

interface RestaurantInfoCardProps {
  config: any
  onChange: (field: any, value: any) => void
  formatPhone: (value: string) => string
  errors?: Record<string, string>
  isSaving?: boolean
}

export function RestaurantInfoCard({ config, onChange, formatPhone, errors = {}, isSaving = false }: RestaurantInfoCardProps) {
  if (!config) return null

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b border-border/50 flex items-center justify-between bg-foreground/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
              Datos del Establecimiento
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Información legal y de contacto
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ConfigField id="companyName" label="Nombre Comercial" icon={Building2} error={errors.companyName}>
            <Input 
              id="companyName"
              value={config.companyName || ""} 
              onChange={(e) => onChange("companyName", e.target.value)} 
              disabled={isSaving}
              data-testid="input-company-name"
              className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all hover:bg-background/80 font-bold" 
            />
          </ConfigField>

          <ConfigField id="companyRuc" label="RUC / Identificación" icon={FileText} error={errors.companyRuc}>
            <Input 
              id="companyRuc"
              value={config.companyRuc || ""} 
              onChange={(e) => onChange("companyRuc", e.target.value)} 
              disabled={isSaving}
              data-testid="input-company-ruc"
              className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all hover:bg-background/80 font-bold font-mono" 
              maxLength={11} 
            />
          </ConfigField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ConfigField id="companyPhone" label="Teléfono" icon={Phone} prefix="+51" error={errors.companyPhone}>
            <Input 
              id="companyPhone"
              value={config.companyPhone ? config.companyPhone.replace('+51 ', '') : ""} 
              onChange={(e) => onChange("companyPhone", e.target.value ? `+51 ${formatPhone(e.target.value)}` : "")} 
              disabled={isSaving}
              data-testid="input-company-phone"
              className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all hover:bg-background/80 font-bold" 
              maxLength={11} 
            />
          </ConfigField>

          <ConfigField id="companyAddress" label="Dirección Fiscal" icon={MapPin} error={errors.companyAddress}>
            <Input 
              id="companyAddress"
              value={config.companyAddress || ""} 
              onChange={(e) => onChange("companyAddress", e.target.value)} 
              disabled={isSaving}
              data-testid="input-company-address"
              className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all hover:bg-background/80 font-bold text-xs" 
            />
          </ConfigField>
        </div>
      </div>
    </div>
  )
}
