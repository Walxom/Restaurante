"use client"

import { useState } from 'react'
import { 
  Printer, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Trash2,
  Settings2,
  Clock,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { usePrinter } from '@/features/billing/hooks/usePrinter'

export default function ThermalPrintAdmin() {
  const { 
    serviceStatus, 
    hardwareStatus, 
    message, 
    isLoading, 
    lastChecked,
    connectionType,
    startService, 
    stopService, 
    checkStatus, 
    clearQueue 
  } = usePrinter()

  const [showStopModal, setShowStopModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL DE CONTROL */}
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-left-4">
        <div className="p-6 border-b border-border/50 flex flex-row items-center justify-between gap-4 bg-foreground/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <Printer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-widest">
                Servidor Impresión
              </h2>
              <p className="hidden sm:block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Controlador Local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkStatus(true)}
              disabled={isLoading}
              data-testid="btn-sync-service"
              className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] border-border/50 bg-background/30 hover:bg-background/50 transition-all"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        <div className="p-0">
          <div className="grid grid-cols-1">
            {/* PANEL DE ESTADO */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 border-b border-border/50">
              <StatusIndicator 
                serviceStatus={serviceStatus} 
                hardwareStatus={hardwareStatus} 
                message={message} 
              />

              <div className="p-4 rounded-2xl bg-background/40 border border-border/50 backdrop-blur-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Última Sincro</span>
                </div>
                <p className="text-xs font-black text-foreground uppercase tracking-widest">
                  {lastChecked ? lastChecked.toLocaleTimeString() : '--:--:--'}
                </p>
              </div>
            </div>

            {/* PANEL DE ACCIONES */}
            <div className="p-4 sm:p-6 lg:p-8 bg-foreground/[0.02] flex flex-col justify-center gap-4 sm:gap-6">
              <div className="space-y-4 sm:space-y-6">
                {serviceStatus === 'inactive' || serviceStatus === 'error' ? (
                  <Button 
                    onClick={startService}
                    disabled={isLoading}
                    data-testid="btn-toggle-service-start"
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group"
                  >
                    <Play className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    Activar Servidor
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setShowStopModal(true)}
                    disabled={isLoading}
                    data-testid="btn-toggle-service-stop"
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all"
                  >
                    <Square className="w-4 h-4 mr-3 fill-current" />
                    Detener Servicio
                  </Button>
                )}

                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold text-primary/70 leading-relaxed uppercase tracking-wider">
                    El servidor centraliza todas las peticiones de impresión de la red local.
                  </p>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const confirmed = window.confirm("¿Estás seguro de que deseas vaciar la cola de impresión? Esto eliminará todos los tickets y comprobantes pendientes en cola.")
                    if (confirmed) {
                      clearQueue()
                    }
                  }}
                  data-testid="btn-clear-queue"
                  className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[9px] text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Vaciar Cola de Impresión
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOGO DE CONFIRMACIÓN */}
      <ConfirmationModal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={() => {
          stopService()
          setShowStopModal(false)
        }}
        title="¿Detener el servicio?"
        description="Al detener el servicio de impresión, el sistema no podrá imprimir tickets ni boletas hasta que se inicie nuevamente de forma manual."
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="danger"
        icon={AlertCircle}
        isLoading={isLoading}
      />
    </div>
  )
}

// SUB-COMPONENTES INTERNOS PARA MEJORAR LA LEGIBILIDAD

function StatusIndicator({ serviceStatus, hardwareStatus, message }: any) {
  const isOnline = serviceStatus === 'active' && hardwareStatus === 'connected'
  const isWarning = serviceStatus === 'active' && hardwareStatus !== 'connected'
  const isError = serviceStatus === 'error' || (serviceStatus === 'inactive' && hardwareStatus === 'error')

  const getStatusColor = () => {
    if (isOnline) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10'
    if (isWarning) return 'text-orange-500 border-orange-500/30 bg-orange-500/5 shadow-orange-500/10'
    return 'text-rose-500 border-rose-500/30 bg-rose-500/5 shadow-rose-500/10'
  }

  const getPulseColor = () => {
    if (isOnline) return 'bg-emerald-500'
    if (isWarning) return 'bg-orange-500'
    return 'bg-rose-500'
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="relative">
        <div className={`p-6 rounded-[2rem] border shadow-xl backdrop-blur-md transition-all duration-500 ${getStatusColor()}`}>
          <Printer className={`w-10 h-10 transition-all duration-500 ${isOnline ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : ''}`} />
        </div>
        
        {serviceStatus === 'active' && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getPulseColor()}`}></span>
            <span className={`relative inline-flex rounded-full h-6 w-6 ${getPulseColor()} border-2 border-background`}></span>
          </span>
        )}
      </div>

      <div className="space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Badge de Software */}
          <Badge 
            variant="outline" 
            data-testid="badge-software-status"
            className={`px-3 py-1 rounded-xl font-black uppercase tracking-widest text-[9px] border-none shadow-sm transition-all ${
              serviceStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
              serviceStatus === 'inactive' ? 'bg-slate-500/10 text-slate-500 dark:text-slate-400' :
              'bg-rose-500/10 text-rose-500'
            }`}
          >
            Software: {serviceStatus === 'active' ? 'Activo' : serviceStatus === 'inactive' ? 'Inactivo' : 'Error'}
          </Badge>
          
          {/* Badge de Hardware */}
          <Badge 
            variant="outline" 
            data-testid="badge-hardware-status"
            className={`px-3 py-1 rounded-xl font-black uppercase tracking-widest text-[9px] border-none shadow-sm transition-all ${
              hardwareStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' :
              hardwareStatus === 'disconnected' ? 'bg-orange-500/10 text-orange-500' :
              hardwareStatus === 'busy' ? 'bg-blue-500/10 text-blue-500' :
              'bg-rose-500/10 text-rose-500'
            }`}
          >
            Hardware: {
              hardwareStatus === 'connected' ? 'Conectado' :
              hardwareStatus === 'disconnected' ? 'Desconectado' :
              hardwareStatus === 'out_of_paper' ? 'Sin Papel' :
              hardwareStatus === 'busy' ? 'Ocupado' : 'Error'
            }
          </Badge>
        </div>
        <div className="max-w-xs mx-auto px-4">
          <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed opacity-80 italic">
            "{message}"
          </p>
        </div>
      </div>
    </div>
  )
}