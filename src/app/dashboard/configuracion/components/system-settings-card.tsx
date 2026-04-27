"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-600" />
          Ajustes Regionales y Fiscales
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConfigField label="IGV (%)" icon={Percent}>
            <Input type="number" value={taxPercentage} onChange={(e) => onTaxChange(e.target.value)} className="pl-10" />
          </ConfigField>

          <ConfigField label="Moneda" icon={Coins}>
            <Select value={config.currency} onValueChange={(val) => onChange("currency", val)}>
              <SelectTrigger className="bg-white pl-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
      </CardContent>
    </Card>
  )
}
