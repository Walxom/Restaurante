"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { type LucideIcon, RefreshCw, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

interface PrinterCardProps {
  title: string
  subtitle: string
  icon: LucideIcon
  status: 'connected' | 'disconnected' | 'error' | 'testing'
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onTest: () => void
  onSave: () => void
  isTesting: boolean
  isLoading: boolean
  children: React.ReactNode
  technicalInfo: {
    label: string
    value: string
  }[]
}

export function PrinterCard({
  title,
  subtitle,
  icon: Icon,
  status,
  enabled,
  onEnabledChange,
  onTest,
  onSave,
  isTesting,
  isLoading,
  children,
  technicalInfo
}: PrinterCardProps) {
  const switchId = useId()
  
  const getStatusConfig = () => {
    if (!enabled) return { label: 'Deshabilitada', color: 'text-muted-foreground bg-muted/60 border-border/50', icon: XCircle }
    switch (status) {
      case 'connected': return { label: 'Conectada', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 }
      case 'error': return { label: 'Error', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: AlertCircle }
      case 'testing': return { label: 'Probando...', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: RefreshCw }
      default: return { label: 'Desconectada', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: XCircle }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cabecera integrada */}
      <div className="p-5 sm:p-6 border-b border-border/50 bg-foreground/[0.02] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight leading-snug">{title}</h3>
            <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Grupo de Control: Switch y Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/50">
            <Switch 
              id={switchId} 
              checked={enabled} 
              onCheckedChange={onEnabledChange} 
              data-testid="switch-printer-enable" 
            />
            <Label 
              htmlFor={switchId} 
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
            >
              {enabled ? 'Habilitada' : 'Inactiva'}
            </Label>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${statusConfig.color} transition-colors duration-300`}>
            <StatusIcon className={`w-3.5 h-3.5 ${status === 'testing' ? 'animate-spin' : ''}`} />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Formulario de configuración */}
      <div className="p-6 sm:p-7 flex-1 space-y-6">
        <div className={`transition-opacity duration-300 ${!enabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {children}
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <Button
            variant="outline"
            onClick={onTest}
            disabled={isTesting || !enabled}
            data-testid="btn-test-printer"
            className="h-11 rounded-2xl font-semibold text-xs border-border/50 bg-background/40 hover:bg-background/80 transition-all gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Probando...' : 'Probar impresión'}
          </Button>

          <Button
            onClick={onSave}
            disabled={isLoading}
            data-testid="btn-save-printer"
            className="h-11 rounded-2xl font-semibold text-xs bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            {isLoading ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </div>

      {/* Metadatos técnicos accesibles */}
      <div className="px-6 py-4 bg-foreground/[0.015] border-t border-border/50">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {technicalInfo.map((info, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">{info.label}:</span>
              <span className="font-semibold text-foreground">{info.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
