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
import { usePrinter } from '@/hooks/usePrinter'

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
        <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-foreground/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
              <Printer className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
                Estado del Servicio
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Control del servidor local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkStatus(true)}
              disabled={isLoading}
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
            <div className="p-8 space-y-8 border-b border-border/50">
              <StatusIndicator 
                serviceStatus={serviceStatus} 
                hardwareStatus={hardwareStatus} 
                message={message} 
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-background/40 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Conexión</span>
                  </div>
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">{connectionType || '---'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-background/40 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sincro</span>
                  </div>
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">
                    {lastChecked ? lastChecked.toLocaleTimeString() : '--:--:--'}
                  </p>
                </div>
              </div>
            </div>

            {/* PANEL DE ACCIONES */}
            <div className="p-8 bg-foreground/[0.02] flex flex-col justify-center gap-6">
              <div className="space-y-6">
                {serviceStatus === 'inactive' || serviceStatus === 'error' ? (
                  <Button 
                    onClick={startService}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group"
                  >
                    <Play className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    Activar Servidor
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setShowStopModal(true)}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all"
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
                  onClick={clearQueue}
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
  const isError = serviceStatus === 'error'

  const getStatusColor = () => {
    if (isOnline) return 'text-emerald-500'
    if (isWarning) return 'text-orange-500'
    if (isError) return 'text-rose-500'
    return 'text-muted-foreground'
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="relative">
        <div className={`p-8 rounded-[2.5rem] bg-background/50 border-4 ${getStatusColor().replace('text', 'border')}/20 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          <Printer className={`w-14 h-14 ${getStatusColor()} transition-all duration-500 ${isOnline ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''}`} />
        </div>
        
        {serviceStatus === 'active' && (
          <span className="absolute -top-1 -right-1 flex h-8 w-8">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-8 w-8 ${isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-orange-500 shadow-lg shadow-orange-500/40'} border-4 border-background`}></span>
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge variant="outline" className={`px-4 py-1.5 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] border-none shadow-sm ${
            isOnline ? 'bg-emerald-500/10 text-emerald-500' : 
            isWarning ? 'bg-orange-500/10 text-orange-500' :
            isError ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'
          }`}>
            Software: {serviceStatus.toUpperCase()}
          </Badge>
          <Badge variant="outline" className={`px-4 py-1.5 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] border-none shadow-sm ${
            hardwareStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
          }`}>
            Hardware: {hardwareStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <div className="max-w-xs mx-auto">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed opacity-80 italic">
            "{message}"
          </p>
        </div>
      </div>
    </div>
  )
}