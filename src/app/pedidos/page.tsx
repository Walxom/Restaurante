"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Plus, ArrowLeft, FileText } from "lucide-react"
import { useOrdersSocket } from "@/hooks/useSocket"
import { RoleGuard } from "@/components/auth/role-guard"

// New modular components
import { OrderCard } from "@/components/orders/OrderCard"
import { OrderFilters } from "@/components/orders/OrderFilters"
import { OrderPagination } from "@/components/orders/OrderPagination"
import { Order } from "@/types"

export default function UnifiedOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"active" | "completed" | "cancelled">("active")
  const [orderCounts, setOrderCounts] = useState({ active: 0, completed: 0, cancelled: 0 })

  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchOrders = useCallback(async () => {
    try {
      if (!session?.user?.id) return
      const todayStr = new Date().toISOString().split('T')[0]
      const statusParam = filter === 'active' ? '&status=active' : `&status=${filter.toUpperCase()}`
      const response = await fetch(`/api/orders?showAll=true&date=${todayStr}${statusParam}`)

      if (response.ok) {
        setOrders(await response.json())
        setCurrentPage(1)
      }
      // Actualizar contadores siempre para mantener la UI sincronizada
      fetchOrderCounts()
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    } finally {
      setIsLoading(false)
    }
  }, [session, filter])

  const fetchOrderCounts = useCallback(async () => {
    try {
      if (!session?.user?.id) return

      const todayStr = new Date().toISOString().split('T')[0]

      // Realizamos peticiones paralelas para cada estado para asegurar precisión
      const [activeRes, completedRes, cancelledRes] = await Promise.all([
        fetch(`/api/orders?showAll=true&status=active`),
        fetch(`/api/orders?showAll=true&status=COMPLETED&date=${todayStr}`),
        fetch(`/api/orders?showAll=true&status=CANCELLED&date=${todayStr}`)
      ])

      if (activeRes.ok && completedRes.ok && cancelledRes.ok) {
        const [activeData, completedData, cancelledData] = await Promise.all([
          activeRes.json(),
          completedRes.json(),
          cancelledRes.json()
        ])

        setOrderCounts({
          active: activeData.length,
          completed: completedData.length,
          cancelled: cancelledData.length
        })
      }
    } catch (error) {
      console.error("Error al sincronizar contadores:", error)
    }
  }, [session])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    fetchOrderCounts()
  }, [fetchOrderCounts])

  useOrdersSocket({
    onNewOrder: fetchOrders,
    onOrderUpdated: fetchOrders,
    onOrderStatusChanged: fetchOrders,
    onOrderItemUpdate: fetchOrders
  })

  const processCompleteOrder = async (
    receiptType: 'none' | 'boleta' | 'factura', 
    customerData?: { name: string; document: string; ruc?: string }
  ): Promise<string> => {
    if (!orderToComplete) return ""
    const response = await fetch(`/api/orders/${orderToComplete.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status: 'COMPLETED',
        receiptType,
        customerData 
      })
    })
    if (response.ok) {
      fetchOrders()
      return "ok"
    }
    return ""
  }

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return
    await fetch(`/api/orders/${orderToCancel}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: 'CANCELLED' })
    })
    setShowCancelConfirm(false)
    fetchOrders()
  }

  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const currentOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-600/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Sincronizando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="fixed inset-0 bg-linear-to-br from-blue-500/[0.02] via-transparent to-indigo-500/[0.02] pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button onClick={() => router.push(session?.user.role === "MESERO" ? "/mesero" : "/dashboard")} variant="ghost" size="sm" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
                </Button>
                <div className="h-6 w-px bg-border/50" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Gestión de Pedidos</h1>
              </div>
              <Button onClick={() => router.push("/pedidos/nuevo")} size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20">
                <Plus className="h-4 w-4 mr-2" /> Nuevo Pedido
              </Button>
            </div>
          </header>

          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <OrderFilters filter={filter} setFilter={setFilter} orderCounts={orderCounts} />

            {orders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 shadow-sm">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50 dark:ring-slate-900/50">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay pedidos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">Parece que no hay pedidos {filter === "active" ? "activos" : filter} hoy.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {currentOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onClick={() => router.push(`/pedidos/${order.id}/detalles`)} />
                  ))}
                </div>
                <div className="flex justify-center pb-8">
                  <OrderPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrevious={() => setCurrentPage(prev => prev - 1)}
                    onNext={() => setCurrentPage(prev => prev + 1)}
                  />
                </div>
              </div>
            )}
          </main>
        </div>

        {showCompleteModal && orderToComplete && (
          <CompleteOrderModal
            isOpen={showCompleteModal}
            onClose={() => setShowCompleteModal(false)}
            onComplete={processCompleteOrder}
            orderNumber={orderToComplete.orderNumber}
            totalAmount={Number(orderToComplete.totalAmount)}
          />
        )}

        <ConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={confirmCancelOrder}
          title="Cancelar Pedido"
          description="¿Estás seguro de que quieres cancelar este pedido?"
          confirmText="Sí, cancelar"
          cancelText="No, mantener"
          variant="destructive"
        />
      </div>
    </RoleGuard>
  )
}