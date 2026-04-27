"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Building2, FileText, Phone, MapPin } from "lucide-react"
import { ConfigField } from "./form-utils"

interface RestaurantInfoCardProps {
  config: any
  onChange: (field: string, value: string) => void
  formatPhone: (value: string) => string
}

export function RestaurantInfoCard({ config, onChange, formatPhone }: RestaurantInfoCardProps) {
  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Datos del Establecimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigField label="Nombre Comercial" icon={Building2}>
            <Input value={config.companyName} onChange={(e) => onChange("companyName", e.target.value)} className="pl-10" />
          </ConfigField>

          <ConfigField label="RUC / Identificación" icon={FileText}>
            <Input value={config.companyRuc || ""} onChange={(e) => onChange("companyRuc", e.target.value)} className="pl-10" maxLength={11} />
          </ConfigField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigField label="Teléfono" icon={Phone} prefix="+51">
            <Input 
              value={config.companyPhone ? config.companyPhone.replace('+51 ', '') : ""} 
              onChange={(e) => onChange("companyPhone", e.target.value ? `+51 ${formatPhone(e.target.value)}` : "")} 
              className="pl-10 rounded-l-none" 
              maxLength={11} 
            />
          </ConfigField>

          <ConfigField label="Dirección Fiscal" icon={MapPin}>
            <Input value={config.companyAddress || ""} onChange={(e) => onChange("companyAddress", e.target.value)} className="pl-10" />
          </ConfigField>
        </div>
      </CardContent>
    </Card>
  )
}
