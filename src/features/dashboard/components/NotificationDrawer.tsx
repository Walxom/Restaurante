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
            "fixed inset-y-0 right-0 z-50 h-full w-full max-w-sm border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
            "flex flex-col"
          )}
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center ring-8 ring-blue-500/5">
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                  Notificaciones
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">Alertas y avisos del sistema</p>
              </div>
              <DialogPrimitive.Description className="sr-only">
                Centro de notificaciones y alertas del sistema
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/5">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">¡Todo al día!</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">No tienes alertas pendientes en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  {alerts.length} AVISOS PENDIENTES
                </p>
                {alerts.map((alert, index) => {
                  const Icon = alert.icon
                  const colorClasses = {
                    error: 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400 shadow-sm shadow-red-500/5',
                    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 shadow-sm shadow-amber-500/5',
                    info: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/5'
                  }
                  
                  return (
                    <Alert key={index} className={cn(colorClasses[alert.type], "relative border shadow-sm group transition-all duration-300 hover:scale-[1.02]")}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-background/50 dark:bg-black/20 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <AlertDescription className="flex-1">
                          <div className="flex flex-col">
                            <span className="font-bold text-[13px] tracking-tight">
                              {alert.title}
                            </span>
                            <span className="text-sm opacity-80 leading-relaxed mt-1">
                              {alert.message}
                            </span>
                            <button className="text-[10px] font-black mt-4 uppercase tracking-[0.1em] flex items-center gap-2 hover:gap-3 transition-all opacity-80 hover:opacity-100 text-foreground/70">
                              {alert.action} <span className="text-sm">→</span>
                            </button>
                          </div>
                        </AlertDescription>
                      </div>
                    </Alert>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/30">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-background border border-border text-foreground rounded-xl text-sm font-medium hover:bg-accent transition-all duration-300 shadow-sm active:scale-[0.98]"
            >
              Cerrar panel
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
