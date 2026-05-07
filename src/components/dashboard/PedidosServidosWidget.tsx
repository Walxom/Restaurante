"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  CheckCircle2, 
  Eye, 
  Package, 
  Utensils, 
  Truck, 
  AlertCircle 
} from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  type: string
  table?: {
    number: number
  }
  user: {
    name: string
  }
  updatedAt?: string
}

interface PedidosServidosWidgetProps {
  title?: string
  showHeader?: boolean
  maxOrders?: number
  className?: string
  onOrderClick?: (orderId: string) => void
  refreshTrigger?: number
  userRole?: 'JEFE' | 'MESERO'
}

export default function PedidosServidosWidget({
  title = "Pedidos Servidos",
  showHeader = true,
  maxOrders = 5,
  className = "",
  onOrderClick,
  refreshTrigger = 0,
  userRole = 'JEFE'
}: PedidosServidosWidgetProps) {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para obtener pedidos servidos
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener pedidos del día actual
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/orders?showAll=true&date=${today}`)
      if (!response.ok) {
        throw new Error('Error al cargar pedidos')
      }
      
      const allOrders = await response.json()
      
      // Filtrar solo pedidos servidos
      const servedOrders = allOrders.filter((order: Order) => 
        order.status === 'SERVED'
      )
      
      // Ordenar por fecha de actualización más reciente
      const sortedOrders = servedOrders.sort((a: Order, b: Order) => {
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
        // Fallback: ordenar por número de pedido
        return b.orderNumber.localeCompare(a.orderNumber)
      })
      
      setOrders(sortedOrders.slice(0, maxOrders))
    } catch (error) {
      console.error('Error al cargar pedidos servidos:', error)
      setError('Error al cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }, [maxOrders])

  // Cargar datos inicialmente y cuando cambie el trigger
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders, refreshTrigger])

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount)
  }

  // Función para manejar click en pedido
  const handleOrderClick = (orderId: string) => {
    if (onOrderClick) {
      onOrderClick(orderId)
    } else {
      router.push('/pedidos')
    }
  }

  // Función para obtener el ícono del tipo de pedido
  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'MESA':
        return <Utensils className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
      case 'DELIVERY':
        return <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
      case 'PARA_LLEVAR':
        return <Package className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
      default:
        return <Package className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
    }
  }

  // Función para obtener el nombre del tipo de pedido
  const getOrderTypeName = (order: Order) => {
    if (order.table?.number) {
      return `Mesa ${order.table.number}`
    }
    switch (order.type) {
      case 'DELIVERY':
        return 'Delivery'
      case 'PARA_LLEVAR':
        return 'Para llevar'
      default:
        return 'Sin especificar'
    }
  }

  // Función para formatear tiempo relativo
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return ''
    
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) {
      return 'Hace unos segundos'
    } else if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `Hace ${hours}h`
    } else {
      return date.toLocaleDateString('es-PE', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 overflow-hidden ${className}`}>
      {showHeader && (
        <div className="p-4 sm:p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              {title}
            </h2>
            <span className="px-2 sm:px-3 py-1 bg-green-100 rounded-full text-xs sm:text-sm font-medium text-green-600">
              {orders.length}
            </span>
          </div>
        </div>
      )}
      
      <div className="p-4 sm:p-6">
        {error ? (
          <div className="text-center py-6 sm:py-8">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-2 sm:mb-3" />
            <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
            <button 
              onClick={fetchOrders}
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Cargando pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-gray-500 font-medium text-sm sm:text-base">No hay pedidos servidos hoy</p>
                <p className="text-gray-400 text-xs sm:text-sm">Los pedidos servidos aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {orders.map((order) => (
                  <div 
                    key={order.id}
                    className="group p-3 sm:p-4 bg-white/50 hover:bg-white/80 border border-gray-200/50 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getOrderTypeIcon(order.type)}
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {getOrderTypeName(order)}
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Servido
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">
                          #{order.orderNumber} - {order.user.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(order.totalAmount || 0)}
                          </span>
                          {order.updatedAt && (
                            <span className="text-xs text-gray-500">
                              {getRelativeTime(order.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
