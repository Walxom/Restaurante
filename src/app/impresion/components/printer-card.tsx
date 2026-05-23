"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, RefreshCw, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

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
    if (!enabled) return { label: 'Deshabilitada', color: 'text-muted-foreground bg-muted', icon: XCircle }
    switch (status) {
      case 'connected': return { label: 'Conectada', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 }
      case 'error': return { label: 'Error', color: 'text-rose-500 bg-rose-500/10', icon: AlertCircle }
      case 'testing': return { label: 'Probando...', color: 'text-blue-500 bg-blue-500/10', icon: RefreshCw }
      default: return { label: 'Desconectada', color: 'text-orange-500 bg-orange-500/10', icon: XCircle }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-6 border-b border-border/50 bg-foreground/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-background/50 flex items-center justify-center border border-border/50 shadow-inner">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">{title}</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{subtitle}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${statusConfig.color} transition-colors duration-500`}>
          <StatusIcon className={`w-3 h-3 ${status === 'testing' ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">{statusConfig.label}</span>
        </div>
      </div>

      <div className="p-8 flex-1 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {children}
        </div>

        <div className="flex items-center justify-between p-4 bg-background/30 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Switch 
              id={switchId} 
              checked={enabled} 
              onCheckedChange={onEnabledChange} 
              data-testid="switch-printer-enable" 
            />
            <Label 
              htmlFor={switchId} 
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer"
            >
              Habilitar Impresora
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={onTest}
            disabled={isTesting || !enabled}
            data-testid="btn-test-printer"
            className="h-12 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] border-border/50 bg-background/30 hover:bg-background/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            Probar
          </Button>
          <Button
            onClick={onSave}
            disabled={isLoading}
            data-testid="btn-save-printer"
            className="h-12 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] bg-primary shadow-lg shadow-primary/20 transition-all"
          >
            Guardar
          </Button>
        </div>
      </div>

      <div className="p-6 bg-foreground/[0.02] border-t border-border/50">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {technicalInfo.map((info, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{info.label}:</span>
              <span className="text-[9px] font-black text-foreground uppercase tracking-widest">{info.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
