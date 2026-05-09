"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useSocket, useOrdersSocket } from "@/hooks/useSocket"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import PedidosPorServirWidget from "@/components/dashboard/PedidosPorServirWidget"
import PedidosServidosWidget from "@/components/dashboard/PedidosServidosWidget"
import { useCompanyName } from "@/hooks/useSystemConfig"
import { 
  Users, 
  Plus, 
  Clock, 
  DollarSign, 
  Eye, 
  LogOut,
  ChefHat,
  Package,
  Truck,
  AlertCircle
} from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number | string
  type: string
  table?: {
    number: number
  }
  user: {
    name: string
    username: string
  }
}

export default function MeseroPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [widgetRefreshTrigger, setWidgetRefreshTrigger] = useState(0)
  const { companyName } = useCompanyName()
  const [stats, setStats] = useState({
    totalTables: 0,
    activeOrders: 0,
    totalSales: 0
  })

  useEffect(() => {
    if (session?.user?.role === 'JEFE') {
      router.push('/dashboard')
      return
    }
    if (session?.user?.role === 'MESERO') {
      fetchDashboardData()
    }
  }, [session, router])

  const fetchDashboardData = useCallback(async () => {
    try {
      // Obtener estadísticas de pedidos activos
      const pendingOrdersResponse = await fetch('/api/orders?showAll=true')
      if (pendingOrdersResponse.ok) {
        const allOrders = await pendingOrdersResponse.json()
        
        // Obtener todos los pedidos activos para estadísticas
        const activeOrders = allOrders.filter((order: Order) => 
          order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'SERVED'
        )
        
        // Calcular total de ventas con validación
        const totalSales = activeOrders.reduce((sum: number, order: Order) => {
          const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount.toString()) || 0
          return sum + amount
        }, 0)
        
        setStats(prev => ({ 
          ...prev, 
          activeOrders: activeOrders.length || 0,
          totalSales: totalSales
        }))
      }
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error)
    }
  }, [])

  // Función optimizada para actualizaciones con debouncing
  const debouncedFetchDashboardData = useCallback(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current
    
    // Throttling: no actualizar más de una vez cada 2 segundos
    if (timeSinceLastUpdate < 2000) {
      // Si hay un timeout pendiente, cancelarlo
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Programar actualización después del tiempo restante
      updateTimeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now()
        fetchDashboardData()
      }, 2000 - timeSinceLastUpdate)
    } else {
      // Actualizar inmediatamente si ha pasado suficiente tiempo
      lastUpdateRef.current = now
      fetchDashboardData()
    }
  }, [fetchDashboardData])

  // Callbacks para actualizaciones en tiempo real
  const handleNewOrder = useCallback((order: any) => {
    console.log('Nuevo pedido recibido en dashboard mesero:', order)
    debouncedFetchDashboardData()
    setWidgetRefreshTrigger(prev => prev + 1)
  }, [debouncedFetchDashboardData])

  const handleOrderUpdated = useCallback((order: any) => {
    console.log('Pedido actualizado en dashboard mesero:', order)
    debouncedFetchDashboardData()
    setWidgetRefreshTrigger(prev => prev + 1)
  }, [debouncedFetchDashboardData])

  const handleOrderStatusChanged = useCallback((data: any) => {
    console.log('Estado de pedido cambiado en dashboard mesero:', data)
    debouncedFetchDashboardData()
  }, [debouncedFetchDashboardData])

  const handleTableUpdated = useCallback((table: any) => {
    console.log('Mesa actualizada en dashboard mesero:', table)
    debouncedFetchDashboardData()
  }, [debouncedFetchDashboardData])

  // Hook para actualizaciones en tiempo real de pedidos
  const { isConnected: ordersConnected } = useOrdersSocket({
    onNewOrder: handleNewOrder,
    onOrderUpdated: handleOrderUpdated,
    onOrderStatusChanged: handleOrderStatusChanged
  })

  // Hook adicional para actualizaciones de mesas
  const { socket: tablesSocket, isConnected: tablesConnected } = useSocket({
    autoConnect: true,
    room: 'tables'
  })

  // Configurar eventos para actualizaciones de mesas
  useEffect(() => {
    if (tablesSocket && tablesConnected) {
      console.log('Conectado a actualizaciones de mesas en tiempo real')
      
      // Listeners para eventos de mesas
      const handleTableUpdated = (table: any) => {
        console.log('Mesa actualizada:', table)
        debouncedFetchDashboardData()
      }
      
      const handleTableStatusChanged = (data: any) => {
        console.log('Estado de mesa cambiado:', data)
        debouncedFetchDashboardData()
      }
      
      // Registrar eventos
      tablesSocket.on('table_updated', handleTableUpdated)
      tablesSocket.on('table_status_changed', handleTableStatusChanged)
      
      // Cleanup
      return () => {
        tablesSocket.off('table_updated', handleTableUpdated)
        tablesSocket.off('table_status_changed', handleTableStatusChanged)
      }
    }
  }, [tablesSocket, tablesConnected, debouncedFetchDashboardData])

  // Cleanup del timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const handleSignOut = () => {
    setShowLogoutModal(true)
  }

  const confirmSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const cancelSignOut = () => {
    setShowLogoutModal(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'CONFIRMED':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'PREPARING':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'READY':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {companyName}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {session?.user?.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      ordersConnected && tablesConnected 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-gray-400">
                      {ordersConnected && tablesConnected ? 'En línea' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Estadísticas compactas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mesas Disponibles</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalTables}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.activeOrders}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ventas Activas</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                  S/ {(typeof stats.totalSales === 'number' ? stats.totalSales : 0).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => router.push("/pedidos/nuevo")}
            className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-semibold mb-1">Nuevo Pedido</h3>
                <p className="text-blue-100 text-xs sm:text-sm">Crear pedido para mesa, delivery o para llevar</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/pedidos")}
            className="group bg-white/70 backdrop-blur-sm hover:bg-white/90 border border-gray-200/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Mis Pedidos</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Ver y gestionar todos los pedidos</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Widgets de Pedidos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Pedidos por Servir - Widget Reutilizable */}
          <PedidosPorServirWidget
            title="Pedidos por Servir"
            refreshTrigger={widgetRefreshTrigger}
            userRole="MESERO"
            maxOrders={6}
            onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
          />
          
          {/* Pedidos Servidos - Widget Reutilizable */}
          <PedidosServidosWidget
            title="Pedidos Servidos"
            refreshTrigger={widgetRefreshTrigger}
            userRole="MESERO"
            maxOrders={6}
            onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
          />
        </div>
      </main>

      {/* Modal de confirmación para cerrar sesión */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Cerrar sesión?
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres cerrar tu sesión?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelSignOut}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSignOut}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
