"use client"

import { useState } from 'react'
import { 
  Printer, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle, 
  Trash2,
  Clock,
  Info,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { 
  usePrinter, 
  type PrinterServiceStatus, 
  type PrinterHardwareStatus 
} from '@/features/billing/hooks/usePrinter'

interface StatusIndicatorProps {
  serviceStatus: PrinterServiceStatus
  hardwareStatus: PrinterHardwareStatus
  message: string
}

export default function ThermalPrintAdmin() {
  const { 
    serviceStatus, 
    hardwareStatus, 
    message, 
    isLoading, 
    lastChecked,
    startService, 
    stopService, 
    checkStatus, 
    clearQueue 
  } = usePrinter()

  const [showStopModal, setShowStopModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* TARJETA PRINCIPAL DE CONTROL */}
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-left-4">
        {/* Cabecera de la tarjeta */}
        <div className="p-5 sm:p-6 border-b border-border/50 flex flex-row items-center justify-between gap-4 bg-foreground/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <Printer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Servidor de Impresión
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Controlador local
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => checkStatus(true)}
            disabled={isLoading || serviceStatus === 'checking'}
            data-testid="btn-sync-service"
            className="h-8 rounded-xl font-semibold text-xs border-border/50 bg-background/40 hover:bg-background/80 transition-all gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || serviceStatus === 'checking' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
        </div>

        {/* Cuerpo del estado */}
        <div className="p-5 sm:p-6 space-y-6 border-b border-border/50">
          <StatusIndicator 
            serviceStatus={serviceStatus} 
            hardwareStatus={hardwareStatus} 
            message={message} 
          />

          <div className="p-3.5 rounded-2xl bg-background/40 border border-border/50 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Última sincronización</span>
            </div>
            <span className="font-mono font-semibold text-foreground">
              {lastChecked ? lastChecked.toLocaleTimeString() : '--:--:--'}
            </span>
          </div>
        </div>

        {/* Acciones del servidor */}
        <div className="p-5 sm:p-6 bg-foreground/[0.01] flex flex-col gap-4">
          {serviceStatus === 'checking' ? (
            <Button 
              disabled
              className="w-full h-11 rounded-2xl font-semibold text-xs bg-muted text-muted-foreground transition-all gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Verificando servicio...
            </Button>
          ) : serviceStatus === 'active' ? (
            <Button 
              variant="outline"
              onClick={() => setShowStopModal(true)}
              disabled={isLoading}
              data-testid="btn-toggle-service-stop"
              className="w-full h-11 rounded-2xl font-semibold text-xs border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all gap-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Detener Servicio
            </Button>
          ) : (
            <Button 
              onClick={startService}
              disabled={isLoading}
              data-testid="btn-toggle-service-start"
              className="w-full h-11 rounded-2xl font-semibold text-xs bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Activar Servidor
            </Button>
          )}

          <div className="flex items-start gap-3 p-3.5 bg-primary/5 border border-primary/10 rounded-2xl text-xs text-muted-foreground leading-relaxed">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>
              El servidor local centraliza las órdenes y comanda las impresoras térmicas de cocina y caja.
            </p>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowClearModal(true)}
            data-testid="btn-clear-queue"
            className="w-full h-9 rounded-xl font-medium text-xs text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar cola de impresión
          </Button>
        </div>
      </div>

      {/* MODAL PARA DETENER SERVICIO */}
      <ConfirmationModal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={() => {
          stopService()
          setShowStopModal(false)
        }}
        title="¿Detener el servicio de impresión?"
        description="Al detener el servicio, las comandas no se imprimirán automáticamente en cocina hasta que se vuelva a activar manualmente."
        confirmText="Detener servicio"
        cancelText="Cancelar"
        variant="danger"
        icon={AlertCircle}
        isLoading={isLoading}
      />

      {/* MODAL ACCESIBLE PARA VACIAR COLA */}
      <ConfirmationModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          clearQueue()
          setShowClearModal(false)
        }}
        title="¿Vaciar la cola de impresión?"
        description="Esta acción eliminará de forma irreversible todos los tickets y comprobantes en espera de impresión."
        confirmText="Vaciar cola"
        cancelText="Cancelar"
        variant="danger"
        icon={Trash2}
        isLoading={isLoading}
      />
    </div>
  )
}

function StatusIndicator({ serviceStatus, hardwareStatus, message }: StatusIndicatorProps) {
  const isChecking = serviceStatus === 'checking'
  const isOnline = serviceStatus === 'active' && hardwareStatus === 'connected'
  const isWarning = serviceStatus === 'active' && hardwareStatus !== 'connected'
  const isError = serviceStatus === 'error' || (serviceStatus === 'inactive' && hardwareStatus === 'error')

  const getContainerStyle = () => {
    if (isChecking) return 'text-primary border-primary/20 bg-primary/5'
    if (isOnline) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10'
    if (isWarning) return 'text-amber-500 border-amber-500/30 bg-amber-500/5 shadow-amber-500/10'
    if (isError) return 'text-rose-500 border-rose-500/30 bg-rose-500/5 shadow-rose-500/10'
    return 'text-muted-foreground border-border/50 bg-background/50'
  }

  const getSoftwareBadge = () => {
    switch (serviceStatus) {
      case 'checking':
        return { label: 'Software: Verificando...', style: 'bg-primary/10 text-primary border-primary/20' }
      case 'active':
        return { label: 'Software: Activo', style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
      case 'inactive':
        return { label: 'Software: Inactivo', style: 'bg-muted text-muted-foreground border-border/50' }
      case 'error':
      default:
        return { label: 'Software: Error', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
    }
  }

  const getHardwareBadge = () => {
    if (isChecking) {
      return { label: 'Hardware: Detectando...', style: 'bg-muted text-muted-foreground border-border/50' }
    }
    switch (hardwareStatus) {
      case 'connected':
        return { label: 'Hardware: Conectado', style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
      case 'disconnected':
        return { label: 'Hardware: Desconectado', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
      case 'out_of_paper':
        return { label: 'Hardware: Sin papel', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
      case 'busy':
        return { label: 'Hardware: Ocupado', style: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
      case 'error':
      default:
        return { label: 'Hardware: Error', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
    }
  }

  const softBadge = getSoftwareBadge()
  const hardBadge = getHardwareBadge()

  return (
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Icono central de estado con halo suave */}
      <div className="relative">
        <div className={`p-5 rounded-3xl border shadow-lg backdrop-blur-md transition-all duration-500 ${getContainerStyle()}`}>
          <Printer className={`w-9 h-9 transition-all duration-500 ${isOnline ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]' : ''}`} />
        </div>
        
        {serviceStatus === 'active' && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
            <span className={`relative inline-flex rounded-full h-4 w-4 ${
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            } border-2 border-background`} />
          </span>
        )}
      </div>

      {/* Badges de estado */}
      <div className="space-y-2 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge 
            variant="outline" 
            data-testid="badge-software-status"
            className={`px-3 py-1 rounded-xl font-bold text-[10px] tracking-wide border shadow-sm transition-all ${softBadge.style}`}
          >
            {softBadge.label}
          </Badge>
          
          <Badge 
            variant="outline" 
            data-testid="badge-hardware-status"
            className={`px-3 py-1 rounded-xl font-bold text-[10px] tracking-wide border shadow-sm transition-all ${hardBadge.style}`}
          >
            {hardBadge.label}
          </Badge>
        </div>

        {/* Mensaje de estado descriptivo */}
        <div className="max-w-xs mx-auto px-2">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
