"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import CompleteOrderModal from "@/features/orders/components/CompleteOrderModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Plus, FileText } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { useOrdersSocket } from "@/hooks/useSocket"
import { RoleGuard } from "@/components/auth/role-guard"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

// New modular components
import { OrderCard } from "@/features/orders/components/OrderCard"
import { OrderFilters } from "@/features/orders/components/OrderFilters"
import { OrderPagination } from "@/features/orders/components/OrderPagination"
import { useAhora, useSlaBeep } from "@/features/orders/hooks/useSlaAlerts"
import { type Order } from "@/types"

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
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  // Token de la última petición en vuelo. Evita que una respuesta obsoleta
  // (p.ej. el fetch de 'active' del montaje) pise a la del filtro/página actual
  // al resolverse fuera de orden, dejando la lista vacía por error.
  const latestReqRef = useRef('')

  // US-14: reloj para el semáforo de SLA y bip al pasar un pedido a rojo (> 18 min).
  const ahora = useAhora()
  useSlaBeep(orders, ahora)

  const fetchOrders = useCallback(async () => {
    try {
      if (!session?.user?.id) return
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const statusParam = filter === 'active' ? '&status=active' : `&status=${filter.toUpperCase()}`
      const reqKey = `${filter}:${currentPage}`
      latestReqRef.current = reqKey
      // Paginación en el servidor: pedimos solo la página actual. Antes se traía
      // todo (tope 200) y se cortaba en cliente, truncando silenciosamente.
      const response = await fetch(`/api/orders?showAll=true&date=${todayStr}${statusParam}&page=${currentPage}&limit=${itemsPerPage}`)

      // Descartar si mientras tanto se inició otra petición (cambio de pestaña/página).
      if (latestReqRef.current !== reqKey) return

      if (response.ok) {
        const { orders, pagination } = await response.json()
        setOrders(orders)
        setTotalPages(pagination?.pages ?? 1)
      }
      // Actualizar contadores siempre para mantener la UI sincronizada
      fetchOrderCounts()
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    } finally {
      setIsLoading(false)
    }
  }, [session, filter, currentPage])

  // Al cambiar de pestaña, volver a la primera página.
  const handleFilterChange = (newFilter: "active" | "completed" | "cancelled") => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const fetchOrderCounts = useCallback(async () => {
    try {
      if (!session?.user?.id) return

      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

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
          active: activeData.pagination?.total ?? activeData.orders?.length ?? 0,
          completed: completedData.pagination?.total ?? completedData.orders?.length ?? 0,
          cancelled: cancelledData.pagination?.total ?? cancelledData.orders?.length ?? 0,
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
    customerData?: { name: string; document: string; ruc?: string },
    paymentMethod?: string,
    amountPaid?: number
  ): Promise<string> => {
    if (!orderToComplete) return ""

    // 1) Marcar el pedido como COMPLETED (requisito previo para facturar).
    const statusRes = await fetch(`/api/orders/${orderToComplete.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: 'COMPLETED' })
    })
    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({}))
      throw new Error(err.error || "No se pudo completar el pedido")
    }

    // 2) Si se pidió comprobante, crear la factura/boleta. El backend genera
    //    el correlativo de forma atómica y calcula el vuelto a partir de
    //    amountPaid (el monto que ingresó el cajero en el modal).
    let receiptNumber = ""
    if (receiptType !== 'none') {
      const total = Number(orderToComplete.totalAmount)
      const paid = typeof amountPaid === 'number' && amountPaid >= total ? amountPaid : total
      const invoiceRes = await fetch('/api/invoices', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderToComplete.id,
          type: receiptType === 'boleta' ? 'BOLETA' : 'FACTURA',
          customerName: customerData?.name || undefined,
          customerRuc: receiptType === 'factura' ? customerData?.ruc : undefined,
          paymentMethod: paymentMethod || 'EFECTIVO',
          amountPaid: paid,
        })
      })
      if (!invoiceRes.ok) {
        const err = await invoiceRes.json().catch(() => ({}))
        throw new Error(err.error || "El pedido se completó pero falló la emisión del comprobante")
      }
      const invoice = await invoiceRes.json()
      receiptNumber = invoice.number || ""
    }

    fetchOrders()
    return receiptNumber
  }

  const [isCancelling, setIsCancelling] = useState(false)

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/orders/${orderToCancel}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Error al cancelar pedido:", err.error)
        return
      }
      setShowCancelConfirm(false)
      setOrderToCancel(null)
      fetchOrders()
    } finally {
      setIsCancelling(false)
    }
  }

  // El servidor ya devuelve solo la página actual.
  const currentOrders = orders

  if (isLoading) {
    return <LoadingSpinner fullPage message="Sincronizando pedidos..." />
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-background">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title="Gestión de Pedidos"
            subtitle="Sincronización y control en tiempo real"
            icon={FileText}
            maxWidth="max-w-[1600px]"
            onBack={() => router.push(session?.user?.role === "MESERO" ? "/mesero" : "/dashboard")}
          >
            <Button
              onClick={() => router.push("/pedidos/nuevo")}
              size="sm"
              className="h-9 px-3 sm:px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
            >
              <Plus className="w-3.5 h-3.5 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Pedido</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </AdminPageHeader>

          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <OrderFilters filter={filter} setFilter={handleFilterChange} orderCounts={orderCounts} />

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
                    <OrderCard
                      key={order.id}
                      order={order}
                      ahora={ahora}
                      onClick={() => router.push(`/pedidos/${order.id}/detalles`)}
                      onEdit={(id) => router.push(`/pedidos/${id}/edit`)}
                      onComplete={(o) => {
                        setOrderToComplete(o)
                        setShowCompleteModal(true)
                      }}
                      onCancel={(id) => {
                        setOrderToCancel(id)
                        setShowCancelConfirm(true)
                      }}
                    />
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
          isLoading={isCancelling}
        />
      </div>
    </RoleGuard>
  )
}