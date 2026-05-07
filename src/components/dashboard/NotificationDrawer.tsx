"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlertTriangle, CheckCircle, Clock, Package, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NotificationDrawerProps {
  isOpen: boolean
  onClose: () => void
  stats: {
    stockBajo: number
    pedidosPendientes: number
    mesas: {
      POR_LIMPIAR?: number
      FUERA_DE_SERVICIO?: number
    }
  } | null
  loading: boolean
}

export function NotificationDrawer({ isOpen, onClose, stats, loading }: NotificationDrawerProps) {
  const alerts = React.useMemo(() => {
    if (!stats) return []
    const items = []

    if (stats.stockBajo > 0) {
      items.push({
        type: 'warning' as const,
        icon: Package,
        title: 'Stock Bajo',
        message: `${stats.stockBajo} ingredientes necesitan reposición`,
        action: 'Revisar inventario'
      })
    }

    if (stats.pedidosPendientes > 5) {
      items.push({
        type: 'warning' as const,
        icon: Clock,
        title: 'Muchos Pedidos Pendientes',
        message: `${stats.pedidosPendientes} pedidos esperando atención`,
        action: 'Revisar cocina'
      })
    }

    if (stats.mesas.POR_LIMPIAR && stats.mesas.POR_LIMPIAR > 0) {
      items.push({
        type: 'info' as const,
        icon: AlertTriangle,
        title: 'Mesas por Limpiar',
        message: `${stats.mesas.POR_LIMPIAR} mesas necesitan limpieza`,
        action: 'Asignar personal'
      })
    }

    if (stats.mesas.FUERA_DE_SERVICIO && stats.mesas.FUERA_DE_SERVICIO > 0) {
      items.push({
        type: 'error' as const,
        icon: AlertTriangle,
        title: 'Mesas Fuera de Servicio',
        message: `${stats.mesas.FUERA_DE_SERVICIO} mesas no disponibles`,
        action: 'Revisar estado'
      })
    }

    return items
  }, [stats])

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300" 
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 h-full w-full max-w-sm border-l bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
            "flex flex-col"
          )}
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
                Notificaciones
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Centro de notificaciones y alertas del sistema
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-full p-2 hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5 text-gray-500" />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-500">Cargando notificaciones...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900">¡Todo al día!</h3>
                <p className="text-sm text-gray-500 mt-1">No tienes alertas pendientes en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tienes {alerts.length} avisos pendientes
                </p>
                {alerts.map((alert, index) => {
                  const Icon = alert.icon
                  const colorClasses = {
                    error: 'border-red-100 bg-red-50 text-red-900',
                    warning: 'border-yellow-100 bg-yellow-50 text-yellow-900',
                    info: 'border-blue-100 bg-blue-50 text-blue-900'
                  }
                  
                  return (
                    <Alert key={index} className={cn(colorClasses[alert.type], "relative border-l-4 shadow-sm")}>
                      <Icon className="h-4 w-4" />
                      <AlertDescription className="ml-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm">
                            {alert.title}
                          </span>
                          <span className="text-sm opacity-90">
                            {alert.message}
                          </span>
                          <button className="text-xs font-semibold mt-2 underline text-left hover:opacity-80 transition-opacity">
                            {alert.action} →
                          </button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t bg-gray-50">
            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors shadow-sm"
            >
              Cerrar panel
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
