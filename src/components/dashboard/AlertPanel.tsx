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
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            Alertas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-500">Cargando alertas...</span>
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
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          {alerts.length > 0 ? (
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          ) : (
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          )}
          Alertas del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 sm:gap-3 text-green-600 py-3 sm:py-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base font-medium">Todo funcionando correctamente</span>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {alerts.map((alert, index) => {
              const Icon = alert.icon
              const colorClasses = {
                error: 'border-red-200 bg-red-50 text-red-800',
                warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
                info: 'border-blue-200 bg-blue-50 text-blue-800'
              }
              
              return (
                <Alert key={index} className={`${colorClasses[alert.type]} rounded-lg sm:rounded-xl border transition-all duration-200 hover:shadow-sm`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <AlertDescription>
                    <div className="flex flex-col gap-1 sm:gap-1.5">
                      <span className="font-semibold text-xs sm:text-sm">
                        {alert.title}
                      </span>
                      <span className="text-xs sm:text-sm leading-relaxed">
                        {alert.message}
                      </span>
                      <span className="text-xs opacity-75 mt-1 font-medium">
                        💡 {alert.action}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}