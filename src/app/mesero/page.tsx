"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useSocket, useOrdersSocket } from "@/hooks/useSocket"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import PedidosPorServirWidget from "@/features/dashboard/components/PedidosPorServirWidget"
import PedidosServidosWidget from "@/features/dashboard/components/PedidosServidosWidget"
import { useCompanyName } from "@/features/dashboard/hooks/useSystemConfig"
import { DashboardPageHeader } from "@/components/layout/DashboardPageHeader"
import { 
  Users, 
  Plus, 
  Clock, 
  DollarSign, 
  Eye,
  Package,
  Truck,
  AlertCircle,
  LogOut
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
      // Pedidos activos + mesas en paralelo. /api/tables solo requiere sesión,
      // así que el mesero puede contar las mesas disponibles (antes nunca se
      // obtenían y la tarjeta "Mesas Disponibles" quedaba siempre en 0).
      const [pendingOrdersResponse, tablesResponse] = await Promise.all([
        fetch('/api/orders?showAll=true&status=active'),
        fetch('/api/tables'),
      ])

      if (pendingOrdersResponse.ok) {
        const { orders: allOrders } = await pendingOrdersResponse.json()

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

      if (tablesResponse.ok) {
        const tables = await tablesResponse.json()
        const totalTables = Array.isArray(tables)
          ? tables.filter((t: { status?: string }) => t.status === 'DISPONIBLE').length
          : 0
        setStats(prev => ({ ...prev, totalTables }))
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
    setWidgetRefreshTrigger(prev => prev + 1)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="fixed inset-0 bg-linear-to-br from-blue-500/[0.03] via-transparent to-indigo-500/[0.03] pointer-events-none" />
      {/* Header minimalista */}
      <DashboardPageHeader
        companyName={companyName}
        userName={session?.user?.name}
        isOnline={ordersConnected && tablesConnected}
        onSignOut={() => setShowLogoutModal(true)}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Estadísticas compactas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Mesas Disponibles</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stats.totalTables}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Activos</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stats.activeOrders}</p>
              </div>
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <Clock className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Ventas Activas</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                  S/ {(typeof stats.totalSales === 'number' ? stats.totalSales : 0).toFixed(2)}
                </p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <DollarSign className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
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
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-slate-500/[0.03] group-hover:bg-transparent transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Mis Pedidos</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Ver y gestionar todos los pedidos</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                <Eye className="w-6 h-6 text-slate-600 dark:text-slate-300" />
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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-8 ring-rose-50/50 dark:ring-rose-500/5">
                <LogOut className="w-10 h-10 text-rose-600 dark:text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                ¿Cerrar sesión?
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Estás a punto de salir del sistema. <br />¿Deseas continuar?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmSignOut}
                  className="w-full px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  Sí, cerrar sesión
                </button>
                <button
                  onClick={cancelSignOut}
                  className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
