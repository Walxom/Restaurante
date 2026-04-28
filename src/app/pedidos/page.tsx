"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed Card imports for minimalist design
import { Badge } from "@/components/ui/badge"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import { ChevronLeft, ChevronRight, Plus, Eye, Clock, CheckCircle, XCircle, ArrowLeft, User, MapPin, Phone, CreditCard, FileText } from "lucide-react"
import { useOrdersSocket } from "@/hooks/useSocket"
import { RoleGuard } from "@/components/auth/role-guard"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  startDate?: string
  endDate?: string
  notes?: string
  customerName?: string
  customerDni?: string
  customerPhone?: string
  customerAddress?: string
  customerReference?: string
  type: string
  table?: {
    id: string
    number: number
    capacity: number
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string
    status: string
    product: {
      id: string
      name: string
      price: number
      category: {
        name: string
      }
    }
  }>
  invoice?: {
    id: string
    type: 'BOLETA' | 'FACTURA'
    number: string
  }
  user: {
    name: string
    username: string
  }
}

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

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Cargar pedidos
  useEffect(() => {
    fetchOrders()
  }, [session])

  // Recargar pedidos cuando cambie el filtro
  useEffect(() => {
    if (session?.user?.id) {
      fetchOrders()
      if (filter !== 'active') {
        fetchOrderCountsOptimized()
      }
    }
  }, [filter])


  const fetchOrders = async () => {
    try {
      if (!session?.user?.id) return

      // Obtener fecha de hoy en formato YYYY-MM-DD
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      // Construir URL con filtros apropiados
      const baseParams = '?showAll=true'
      const statusParam = filter === 'active' ? '&status=active' :
        filter === 'completed' ? '&status=COMPLETED' :
          filter === 'cancelled' ? '&status=CANCELLED' : ''

      const queryParams = `${baseParams}&date=${todayStr}${statusParam}`

      // Hacer petición con filtros específicos
      const response = await fetch(`/api/orders${queryParams}`)

      if (response.ok) {
        const filteredOrders = await response.json()
        setOrders(filteredOrders)
        setCurrentPage(1) // Resetear a la primera página cuando se cargan nuevos datos
      }

      // Obtener contadores por separado solo una vez para evitar peticiones duplicadas
      if (filter === 'active') {
        await fetchOrderCountsOptimized()
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrderCountsOptimized = async () => {
    try {
      if (!session?.user?.id) return

      // Obtener fecha de hoy en formato YYYY-MM-DD
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      // Obtener todos los pedidos del día de una sola vez para calcular contadores
      const response = await fetch(`/api/orders?showAll=true&date=${todayStr}`)

      if (response.ok) {
        const allOrders = await response.json()

        // Calcular contadores desde los datos obtenidos
        const activeOrders = allOrders.filter((order: Order) =>
          order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'SERVED'
        )
        const completedOrders = allOrders.filter((order: Order) => order.status === 'COMPLETED')
        const cancelledOrders = allOrders.filter((order: Order) => order.status === 'CANCELLED')

        setOrderCounts({
          active: activeOrders.length,
          completed: completedOrders.length,
          cancelled: cancelledOrders.length
        })
      }
    } catch (error) {
      console.error("Error al cargar contadores:", error)
    }
  }

  // Callbacks estables para Socket.IO
  const handleNewOrder = useCallback((order: any) => {
    console.log('Nuevo pedido recibido:', order)
    fetchOrders() // Refrescar la lista
    if (filter !== 'active') {
      fetchOrderCountsOptimized() // Actualizar contadores si no estamos en vista activa
    }
  }, [fetchOrders, filter])

  const handleOrderUpdated = useCallback((order: any) => {
    console.log('Pedido actualizado:', order)
    fetchOrders() // Refrescar la lista
    if (filter !== 'active') {
      fetchOrderCountsOptimized() // Actualizar contadores si no estamos en vista activa
    }
  }, [fetchOrders, filter])

  const handleOrderStatusChanged = useCallback((data: any) => {
    console.log('Estado de pedido cambiado:', data)
    fetchOrders() // Refrescar la lista
    if (filter !== 'active') {
      fetchOrderCountsOptimized() // Actualizar contadores si no estamos en vista activa
    }
  }, [fetchOrders, filter])

  const handleOrderItemUpdate = useCallback((data: any) => {
    console.log('Item de pedido actualizado:', data)
    fetchOrders() // Refrescar la lista cuando se actualicen items
    if (filter !== 'active') {
      fetchOrderCountsOptimized() // Actualizar contadores si no estamos en vista activa
    }
  }, [fetchOrders, filter])

  // Hook para actualizaciones en tiempo real
  const { isConnected } = useOrdersSocket({
    onNewOrder: handleNewOrder,
    onOrderUpdated: handleOrderUpdated,
    onOrderStatusChanged: handleOrderStatusChanged,
    onOrderItemUpdate: handleOrderItemUpdate
  })

  const changeOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrders() // Refrescar la lista

      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      alert("Error al cambiar el estado del pedido")
    }
  }

  const markAllItemsAsServed = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/items/mark-all-served`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ ${result.message}`)
        fetchOrders() // Refrescar la lista

      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error al marcar todos los items como servidos:", error)
      alert("Error al marcar todos los items como servidos")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'READY': return 'bg-green-100 text-green-800 border-green-200'
      case 'SERVED': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'CONFIRMED': return 'Confirmado'
      case 'PREPARING': return 'En Preparación'
      case 'READY': return 'Listo'
      case 'SERVED': return 'Servido'
      case 'COMPLETED': return 'Completado'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  const handleCompleteOrder = (order: Order) => {
    setOrderToComplete(order)
    setShowCompleteModal(true)
  }

  const onCompleteOrderSuccess = async () => {
    setShowCompleteModal(false)
    setOrderToComplete(null)
    await fetchOrders()
  }

  const processCompleteOrder = async (receiptType: 'none' | 'boleta' | 'factura', customerData?: any) => {
    try {
      if (!orderToComplete) return

      // Primero actualizar los datos del cliente en el pedido si se proporcionaron
      if (customerData && (customerData.name || customerData.document)) {
        const updateResponse = await fetch(`/api/orders/${orderToComplete.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customerName: customerData.name || orderToComplete.customerName,
            customerDni: customerData.document || orderToComplete.customerDni
          })
        })

        if (!updateResponse.ok) {
          console.error('Error al actualizar datos del cliente en el pedido')
        }
      }

      // Luego completar el pedido
      const response = await fetch(`/api/orders/${orderToComplete.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error al completar pedido: ${error.error}`)
        return
      }

      let receiptNumber = null

      // Si se seleccionó un tipo de comprobante, crear la factura
      if (receiptType !== 'none') {
        const invoiceResponse = await fetch('/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: receiptType.toUpperCase(),
            orderId: orderToComplete.id,
            customerName: customerData?.name || 'Cliente',
            customerDocument: customerData?.document || '',
            customerRuc: customerData?.ruc || '',
            paymentMethod: 'EFECTIVO',
            amountPaid: Number(orderToComplete.totalAmount) * 1.18 // Total con IGV incluido
          })
        })

        if (invoiceResponse.ok) {
          const invoice = await invoiceResponse.json()
          receiptNumber = invoice.number
        } else {
          const error = await invoiceResponse.json()
          console.error(`Error al generar ${receiptType}:`, error.error)
          throw new Error(`Error al generar ${receiptType}`)
        }
      }

      // Refrescar los pedidos
      fetchOrders()



      // Retornar el número de comprobante para que el modal lo use
      return receiptNumber
    } catch (error) {
      console.error('Error al procesar completar pedido:', error)
      throw error // Re-lanzar el error para que el modal lo maneje
    }
  }

  // Función para cerrar el modal (será llamada por el modal después de mostrar la animación)
  const handleCloseCompleteModal = () => {
    setShowCompleteModal(false)
    setOrderToComplete(null)
  }



  const handleAddItemsToOrder = (orderId: string) => {
    // Navegar a la página de edición del pedido
    if (session?.user.role === "MESERO") {
      router.push(`/pedidos/${orderId}/edit`)
    } else {
      // Para jefes, también pueden usar la misma página de edición
      router.push(`/pedidos/${orderId}/edit`)
    }
  }

  // Función para verificar si un pedido puede ser cancelado (no tiene items servidos)
  const canCancelOrder = (order: Order) => {
    return !order.orderItems.some(item => item.status === 'SERVED')
  }

  // Función para cancelar pedido
  const handleCancelOrder = async (orderId: string) => {
    setOrderToCancel(orderId)
    setShowCancelConfirm(true)
  }

  const confirmCancelOrder = async () => {
    if (orderToCancel) {
      await changeOrderStatus(orderToCancel, 'CANCELLED')
      setOrderToCancel(null)
      setShowCancelConfirm(false)
    }
  }

  // Calcular paginación
  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = orders.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Cargando pedidos...</div>
      </div>
    )
  }



  // Vista principal de lista de pedidos
  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header minimalista */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
                <Button
                  onClick={() => {
                    if (session?.user.role === "MESERO") {
                      router.push("/mesero")
                    } else {
                      router.push("/dashboard")
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 rounded-xl px-2 sm:px-3 flex-shrink-0"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline text-sm">Dashboard</span>
                </Button>
                <div className="h-4 sm:h-6 w-px bg-gray-300 hidden sm:block"></div>
                <h1 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">Gestión de Pedidos</h1>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {(session?.user.role === "MESERO" || session?.user.role === "JEFE") && (
                  <Button
                    onClick={() => router.push("/pedidos/nuevo")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl px-2 sm:px-3 lg:px-4 text-xs sm:text-sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Nuevo Pedido</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Filtros y contadores */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200/50 mb-4 sm:mb-6">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Estado de Pedidos</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {session?.user.role === "JEFE" ? "Vista general de todos los pedidos" : "Tus pedidos del día"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={() => setFilter("active")}
                variant={filter === "active" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 flex-1 sm:flex-none"
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Activos</span>
                <span className="xs:hidden">Act.</span>
                ({orderCounts.active})
              </Button>
              <Button
                onClick={() => setFilter("completed")}
                variant={filter === "completed" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 flex-1 sm:flex-none"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Completados</span>
                <span className="xs:hidden">Comp.</span>
                ({orderCounts.completed})
              </Button>
              <Button
                onClick={() => setFilter("cancelled")}
                variant={filter === "cancelled" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 flex-1 sm:flex-none"
              >
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Cancelados</span>
                <span className="xs:hidden">Canc.</span>
                ({orderCounts.cancelled})
              </Button>
            </div>
          </div>

          {/* Lista de pedidos */}
          {orders.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200/50">
              <div className="text-center py-8 sm:py-12">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No hay pedidos</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {filter === "active" ? "No hay pedidos activos en este momento." :
                    filter === "completed" ? "No hay pedidos completados hoy." :
                      "No hay pedidos cancelados hoy."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:gap-4">
                {currentOrders.map((order) => (
                  <div key={order.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200/50 hover:shadow-md hover:bg-white/80 transition-all cursor-pointer"
                    onClick={() => router.push(`/pedidos/${order.id}/detalles`)}>
                    <div className="mb-3 sm:mb-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 truncate">
                            <span className="truncate">Pedido #{order.orderNumber}</span>
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                          </h3>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <span className="font-medium">
                                {order.type === 'MESA' && order.table ? `Mesa ${order.table.number}` :
                                  order.type === 'DELIVERY' ? '🚚 Delivery' :
                                    '🥡 Para llevar'}
                              </span>
                              <span className="hidden sm:inline">•</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <span>Mesero: {order.user.name}</span>
                              <span className="hidden sm:inline">•</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end sm:justify-start gap-2 flex-shrink-0">
                          <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-1`}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                        {order.orderItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between items-start sm:items-center py-1 text-xs sm:text-sm gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900 block truncate">{item.product.name}</span>
                              <span className="text-gray-600 text-xs">x{item.quantity}</span>
                            </div>
                            <span className="font-medium text-gray-900 flex-shrink-0">
                              S/ {Number(item.subtotal).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {order.orderItems.length > 3 && (
                          <div className="text-xs sm:text-sm text-gray-500 italic py-1">
                            ... y {order.orderItems.length - 3} items más
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-gray-200">
                        <span className="font-semibold text-base sm:text-lg text-gray-900">Total:</span>
                        <span className="font-bold text-lg sm:text-xl text-green-600">
                          S/ {Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1 sm:gap-2 mt-4 sm:mt-6">
                  <Button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>

                  <div className="flex gap-0.5 sm:gap-1 max-w-xs overflow-x-auto scrollbar-hide">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        onClick={() => goToPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm flex-shrink-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-2 sm:px-3"
                  >
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Modal para completar pedido */}
        {showCompleteModal && orderToComplete && (
          <CompleteOrderModal
            isOpen={showCompleteModal}
            onClose={handleCloseCompleteModal}
            onComplete={processCompleteOrder}
            orderNumber={orderToComplete.orderNumber}
            totalAmount={Number(orderToComplete.totalAmount)}
          />
        )}

        {/* Modal de confirmación para cancelar pedido */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={confirmCancelOrder}
          title="Cancelar Pedido"
          description="¿Estás seguro de que quieres cancelar este pedido? Esta acción no se puede deshacer."
          confirmText="Sí, cancelar"
          cancelText="No, mantener"
          variant="destructive"
        />
      </div>
    </RoleGuard>
  )
}