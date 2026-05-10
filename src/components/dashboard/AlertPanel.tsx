"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Clock, Package } from "lucide-react"

interface AlertPanelProps {
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

export function AlertPanel({ stats, loading }: AlertPanelProps) {
  if (loading || !stats) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            Alertas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-3 text-sm text-muted-foreground font-medium">Cargando alertas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const alerts = []

  // Alerta de stock bajo
  if (stats.stockBajo > 0) {
    alerts.push({
      type: 'warning' as const,
      icon: Package,
      title: 'Stock Bajo',
      message: `${stats.stockBajo} ingredientes necesitan reposición`,
      action: 'Revisar inventario'
    })
  }

  // Alerta de pedidos pendientes
  if (stats.pedidosPendientes > 5) {
    alerts.push({
      type: 'warning' as const,
      icon: Clock,
      title: 'Muchos Pedidos Pendientes',
      message: `${stats.pedidosPendientes} pedidos esperando atención`,
      action: 'Revisar cocina'
    })
  }

  // Alerta de mesas por limpiar
  if (stats.mesas.POR_LIMPIAR && stats.mesas.POR_LIMPIAR > 0) {
    alerts.push({
      type: 'info' as const,
      icon: AlertTriangle,
      title: 'Mesas por Limpiar',
      message: `${stats.mesas.POR_LIMPIAR} mesas necesitan limpieza`,
      action: 'Asignar personal'
    })
  }

  // Alerta de mesas fuera de servicio
  if (stats.mesas.FUERA_DE_SERVICIO && stats.mesas.FUERA_DE_SERVICIO > 0) {
    alerts.push({
      type: 'error' as const,
      icon: AlertTriangle,
      title: 'Mesas Fuera de Servicio',
      message: `${stats.mesas.FUERA_DE_SERVICIO} mesas no disponibles`,
      action: 'Revisar estado'
    })
  }

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-3 text-foreground">
          <div className={`p-2 rounded-lg ${alerts.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
            {alerts.length > 0 ? (
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            )}
          </div>
          Alertas del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 py-3 sm:py-4 px-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-full">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-sm sm:text-base font-bold">Todo funcionando correctamente</span>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {alerts.map((alert, index) => {
              const Icon = alert.icon
              const colorClasses = {
                error: 'border-red-500/20 bg-red-500/5 dark:bg-red-500/10 text-red-700 dark:text-red-400',
                warning: 'border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
                info: 'border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
              }
              
              return (
                <Alert key={index} className={`${colorClasses[alert.type]} rounded-xl border shadow-sm transition-all duration-300 hover:scale-[1.01]`}>
                  <div className="flex gap-3">
                    <div className="p-2 bg-background/50 dark:bg-black/20 rounded-lg h-fit">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <AlertDescription>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs sm:text-sm tracking-tight">
                          {alert.title}
                        </span>
                        <span className="text-xs sm:text-sm leading-relaxed opacity-80 mt-0.5">
                          {alert.message}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-3 opacity-70">
                          <span className="p-1 bg-current/10 rounded-md">💡</span>
                          {alert.action}
                        </div>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}