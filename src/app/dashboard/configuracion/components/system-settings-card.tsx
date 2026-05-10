"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Settings, Percent, Coins, Globe } from "lucide-react"
import { ConfigField, TimeZoneSelect } from "./form-utils"
import { SUPPORTED_CURRENCIES } from "@/lib/system-config"

interface SystemSettingsCardProps {
  config: any
  taxPercentage: string
  onTaxChange: (value: string) => void
  onChange: (field: string, value: string) => void
  timezones: any[]
}

export function SystemSettingsCard({ config, taxPercentage, onTaxChange, onChange, timezones }: SystemSettingsCardProps) {
  if (!config) return null

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b border-border/50 flex items-center justify-between bg-foreground/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Settings className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
              Ajustes Regionales y Fiscales
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Moneda, impuestos y zona horaria
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ConfigField label="IGV (%)" icon={Percent}>
            <Input 
              type="number" 
              value={taxPercentage} 
              onChange={(e) => onTaxChange(e.target.value)} 
              className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all hover:bg-background/80 font-bold" 
            />
          </ConfigField>

          <ConfigField label="Moneda" icon={Coins}>
            <Select value={config.currency} onValueChange={(val) => onChange("currency", val)}>
              <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-11 pl-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl">
                {SUPPORTED_CURRENCIES.map(c => (
                  <SelectItem 
                    key={c.value} 
                    value={c.value}
                    className="font-bold uppercase tracking-widest text-[10px]"
                  >
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>

          <ConfigField label="Zona Horaria" icon={Globe}>
            <TimeZoneSelect 
              value={config.timezone} 
              onValueChange={(val: string) => onChange("timezone", val)} 
              timezones={timezones} 
            />
          </ConfigField>
        </div>
      </div>
    </div>
  )
}
