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
import { usePrinter } from '@/hooks/use-printer'

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
      <Card className="border-gray-200 shadow-xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg">
                  <Printer className="w-6 h-6 text-white" />
                </div>
                Servicio de Impresión
              </CardTitle>
              <CardDescription className="text-gray-500">
                Gestión del servidor de impresión térmica local
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => checkStatus(true)}
                disabled={isLoading}
                className="rounded-full bg-white hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearQueue}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Cola
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* PANEL DE ESTADO */}
            <div className="p-8 space-y-8 border-b md:border-b-0 md:border-r border-gray-100">
              <StatusIndicator 
                serviceStatus={serviceStatus} 
                hardwareStatus={hardwareStatus} 
                message={message} 
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Conexión</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{connectionType || 'Desconocida'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Visto</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {lastChecked ? lastChecked.toLocaleTimeString() : '--:--:--'}
                  </p>
                </div>
              </div>
            </div>

            {/* PANEL DE ACCIONES */}
            <div className="p-8 bg-gray-50/30 flex flex-col justify-center gap-6">
              <div className="space-y-4">
                {serviceStatus === 'inactive' || serviceStatus === 'error' ? (
                  <Button 
                    onClick={startService}
                    disabled={isLoading}
                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-2xl transition-all active:scale-95"
                  >
                    <Play className="w-6 h-6 mr-3 fill-current" />
                    Iniciar Servicio
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setShowStopModal(true)}
                    disabled={isLoading}
                    className="w-full h-14 text-lg font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Square className="w-5 h-5 mr-3 fill-current" />
                    Detener Servicio
                  </Button>
                )}

                <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-2xl">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    El servicio debe estar <span className="font-bold text-blue-600">Activo</span> para poder enviar pedidos a cocina y generar boletas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        confirmText="Sí, detener servicio"
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
  const getStatusColor = () => {
    if (serviceStatus === 'active') {
      return hardwareStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'
    }
    if (serviceStatus === 'error') return 'text-red-600'
    return 'text-gray-400'
  }

  const getBadgeVariant = () => {
    if (serviceStatus === 'active') return hardwareStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="relative">
        <div className={`p-6 rounded-full bg-white border-4 ${getStatusColor().replace('text', 'border')} shadow-xl`}>
          <Printer className={`w-12 h-12 ${getStatusColor()}`} />
        </div>
        {serviceStatus === 'active' && (
          <span className="absolute bottom-1 right-1 flex h-6 w-6">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hardwareStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-6 w-6 ${hardwareStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className={`px-3 py-1 rounded-full font-bold border-none ${getBadgeVariant()}`}>
            Servicio: {serviceStatus.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 rounded-full font-bold bg-white text-gray-500">
            Hardware: {hardwareStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  )
}