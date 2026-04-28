"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed Card imports for minimalist design
import OrderItemsList from "@/components/OrderItemsList"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import ThermalPrintButton from "@/components/ThermalPrintButton"
import ConfirmDialog from "@/components/ConfirmDialog"
import { useOrdersSocket } from "@/hooks/useSocket"

import { ArrowLeft, Clock, User, MapPin, Phone, CreditCard, FileText, Plus, Search, Printer } from "lucide-react"

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
  customerPhone?: string
  customerDni?: string
  customerAddress?: string
  customerAddressReference?: string
  type: string
  table?: {
    number: number
    capacity: number
  }
  user: {
    name: string
    username: string
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string
    status: string
    product: {
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
    customerName?: string
    customerRuc?: string
    customerAddress?: string
    subtotal: number
    igv: number
    total: number
    paymentMethod: string
    amountPaid: number
    change: number
    status: string
    issuedAt: string
    user: {
      name: string
    }
  }
}

export default function OrderDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orderNotFound, setOrderNotFound] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [selectedOrderToComplete, setSelectedOrderToComplete] = useState<Order | null>(null)
  const [isMarkingAllServed, setIsMarkingAllServed] = useState(false)
  const [lastMarkAllServedCall, setLastMarkAllServedCall] = useState(0)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isPrintingKitchen, setIsPrintingKitchen] = useState(false)
  const [showKitchenPrintConfirm, setShowKitchenPrintConfirm] = useState(false)
  const [isPrintingPreReceipt, setIsPrintingPreReceipt] = useState(false)


  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "MESERO" && session.user.role !== "JEFE") {
      router.push("/dashboard")
    }
  }, [session, router])

  // Cargar pedido
  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Callbacks para actualizaciones en tiempo real
  const handleOrderUpdated = useCallback((updatedOrder: any) => {
    console.log('Pedido actualizado en tiempo real:', updatedOrder)
    // Solo actualizar si es el pedido que estamos viendo
    if (updatedOrder.id === orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleOrderItemUpdate = useCallback((data: any) => {
    console.log('Item de pedido actualizado en tiempo real:', data)
    // Solo actualizar si es del pedido que estamos viendo
    if (data.orderId === orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleOrderStatusChanged = useCallback((data: any) => {
    console.log('Estado de pedido cambiado en tiempo real:', data)
    // Solo actualizar si es el pedido que estamos viendo
    if (data.orderId === orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Hook para actualizaciones en tiempo real
  const { isConnected } = useOrdersSocket({
    onOrderUpdated: handleOrderUpdated,
    onOrderItemUpdate: handleOrderItemUpdate,
    onOrderStatusChanged: handleOrderStatusChanged
  })

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setOrderNotFound(false)
      } else if (response.status === 404) {
        setOrderNotFound(true)
      }
    } catch (error) {
      console.error("Error al cargar pedido:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const changeOrderStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrder() // Refrescar el pedido
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      alert("Error al cambiar el estado del pedido")
    }
  }

  const markAllItemsAsServed = async () => {
    const now = Date.now()
    
    // Prevenir múltiples llamadas simultáneas
    if (isMarkingAllServed) {
      return
    }

    // Verificar antes de enviar si hay items pendientes
    if (!hasPendingItems()) {
      alert("Todos los items ya están servidos")
      return
    }

    // Debouncing: prevenir llamadas muy rápidas (menos de 1 segundo)
    if (now - lastMarkAllServedCall < 1000) {
      console.log('Llamada muy rápida, ignorando...')
      return
    }

    setLastMarkAllServedCall(now)
    setIsMarkingAllServed(true)
    
    try {
      const response = await fetch(`/api/orders/${orderId}/items/mark-all-served`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        await fetchOrder() // Refrescar el pedido y esperar a que termine
      } else {
        const error = await response.json()
        
        // Manejar errores específicos
        if (error.error === "No hay items pendientes para marcar como servidos") {
          alert("Todos los items ya están servidos")
        } else if (error.error && error.error.includes("ya está en estado")) {
          alert("Este pedido ya no se puede modificar porque está completado o cancelado")
        } else {
          alert(`Error: ${error.error}`)
        }
      }
    } catch (error) {
      console.error("Error al marcar items como servidos:", error)
      alert("Error al marcar los items como servidos")
    } finally {
      setIsMarkingAllServed(false)
    }
  }

  const handleCompleteOrder = () => {
    if (order) {
      setSelectedOrderToComplete(order)
      setCompleteModalOpen(true)
    }
  }

  const processCompleteOrder = async (receiptType: string, customerData?: { name?: string; document?: string; ruc?: string }) => {
    if (!order) return

    try {
      // Primero actualizar los datos del cliente en el pedido si se proporcionaron
      if (customerData && (customerData.name || customerData.document)) {
        const updateResponse = await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customerName: customerData.name || order.customerName,
            customerDni: customerData.document || order.customerDni
          })
        })

        if (!updateResponse.ok) {
          console.error('Error al actualizar datos del cliente en el pedido')
        }
      }

      // Luego completar el pedido
      const response = await fetch(`/api/orders/${order.id}/status`, {
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
            orderId: order.id,
            customerName: customerData?.name || 'Cliente',
            customerDocument: customerData?.document || '',
            customerRuc: customerData?.ruc || '',
            paymentMethod: 'EFECTIVO',
            amountPaid: Number(order.totalAmount) // El total ya incluye IGV
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

      // Refrescar el pedido
      fetchOrder()
      
      // Retornar el número de comprobante para que el modal lo use
      return receiptNumber
    } catch (error) {
      console.error('Error al procesar completar pedido:', error)
      throw error // Re-lanzar el error para que el modal lo maneje
    }
  }

  // Función para cerrar el modal (será llamada por el modal después de mostrar la animación)
  const handleCloseCompleteModal = () => {
    setCompleteModalOpen(false)
    setSelectedOrderToComplete(null)
  }

  // Función para mostrar modal de confirmación para reenviar a cocina
  const handleShowKitchenPrintConfirm = () => {
    setShowKitchenPrintConfirm(true)
  }

  // Función para reenviar pedido a cocina (después de confirmación)
  const handleConfirmPrintToKitchen = async () => {
    if (!order) return

    setShowKitchenPrintConfirm(false)
    setIsPrintingKitchen(true)
    
    try {
      const response = await fetch('/api/thermal-print/kitchen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          tableNumber: order.table?.number?.toString() || 'N/A',
          waiterName: session?.user?.name || 'Sistema',
          isUrgent: false
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Mostrar mensaje de éxito con detalles
        const message = `Orden #${result.orderNumber || order.orderNumber} enviada a cocina exitosamente`
        alert(message)
        
        console.log('✅ Orden enviada a cocina:', result)
      } else {
        throw new Error(result.error || result.details || 'Error enviando a cocina')
      }
    } catch (error) {
      console.error('❌ Error enviando orden a cocina:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      // Mostrar error
      alert(`Error enviando a cocina: ${errorMessage}`)
    } finally {
      setIsPrintingKitchen(false)
    }
  }

  const handlePrintPreReceipt = async () => {
    if (!order) return
    setIsPrintingPreReceipt(true)
    try {
      const response = await fetch('/api/thermal-print/pre-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al imprimir Pre-Boleta')
      }
      alert('Pre-Boleta enviada a la impresora de caja')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al imprimir Pre-Boleta')
    } finally {
      setIsPrintingPreReceipt(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'SERVED': return 'bg-green-100 text-green-800 border-green-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'CONFIRMED': return 'Confirmado'
      case 'SERVED': return 'Servido'
      case 'COMPLETED': return 'Completado'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  // Función para verificar si un pedido puede ser cancelado (no tiene items servidos)
  const canCancelOrder = () => {
    return order && !order.orderItems.some(item => item.status === 'SERVED')
  }

  // Función para verificar si hay items pendientes para marcar como servidos
  const hasPendingItems = () => {
    return order && order.orderItems.some(item => item.status === 'PENDING')
  }

  // Función para cancelar pedido
  const handleCancelOrder = async () => {
    setShowCancelConfirm(true)
  }

  const confirmCancelOrder = async () => {
    await changeOrderStatus('CANCELLED')
    setShowCancelConfirm(false)
  }

  const getNextStatusActions = (status: string) => {
    const actions = []
    
    switch (status) {
      case 'PENDING':
        actions.push(
          { status: 'CONFIRMED', label: 'Confirmar Pedido', color: 'bg-blue-600 hover:bg-blue-700', action: 'status' }
        )
        break
      case 'CONFIRMED':
        // Solo mostrar "Marcar Todo Servido" si hay items pendientes
        if (hasPendingItems()) {
          actions.push(
            { status: 'SERVED', label: 'Marcar Todo Servido', color: 'bg-green-600 hover:bg-green-700', action: 'markAllServed' }
          )
        }
        break
      case 'SERVED':
        actions.push(
          { status: 'COMPLETED', label: 'Completar y Cobrar', color: 'bg-gray-600 hover:bg-gray-700', action: 'complete' }
        )
        break
    }
    
    // Agregar botón de cancelar si no hay items servidos y el pedido no está completado o cancelado
    if (canCancelOrder() && !['COMPLETED', 'CANCELLED'].includes(status)) {
      actions.push(
        { status: 'CANCELLED', label: 'Cancelar Pedido', color: 'bg-red-600 hover:bg-red-700', action: 'cancel' }
      )
    }
    
    return actions
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-xl font-medium text-gray-700">Cargando pedido...</div>
            <div className="text-sm text-gray-500">Por favor espera un momento</div>
          </div>
        </div>
      </div>
    )
  }

  if (orderNotFound || (!order && !isLoading)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg text-center">
           <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
           <div className="text-xl font-medium text-red-600 mb-2">Pedido no encontrado</div>
          <div className="text-gray-600 mb-6">El pedido que buscas no existe o ha sido eliminado</div>
          <Button onClick={() => router.push("/pedidos")} className="bg-blue-600 hover:bg-blue-700">
            Volver a Pedidos
          </Button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista optimizado para móviles */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button 
                onClick={() => router.push("/pedidos")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 p-1 sm:p-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Pedidos</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                  <span className="sm:hidden">Pedido #{order.orderNumber}</span>
                  <span className="hidden sm:inline">Pedido #{order.orderNumber}</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {order.type === 'MESA' && order.table ? `Mesa ${order.table.number}` : 
                   order.type === 'DELIVERY' ? '🚚 Delivery' : 
                   '🥡 Para llevar'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(order.status)}`}>
                <span className="sm:hidden">{getStatusText(order.status)}</span>
                <span className="hidden sm:inline">{getStatusText(order.status)}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Información del Pedido
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha y Hora</label>
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Mesero</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900">{order.user.name}</p>
                  </div>
                </div>

                {order.type === 'MESA' && order.table && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Mesa</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900">
                        Mesa {order.table.number} (Capacidad: {order.table.capacity})
                      </p>
                    </div>
                  </div>
                )}

                {/* Información del Cliente - Para pedidos para llevar, delivery o con datos de cliente */}
                {(order.type === 'PARA_LLEVAR' || order.type === 'DELIVERY' || order.customerName || order.customerPhone || order.customerDni) && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">
                      {order.type === 'DELIVERY' ? 'Información de Delivery' : 'Información del Cliente'}
                    </label>
                    
                    {order.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-900 font-medium">{order.customerName}</p>
                          <p className="text-xs text-gray-500">Nombre completo</p>
                        </div>
                      </div>
                    )}

                    {order.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-900">{order.customerPhone}</p>
                          <p className="text-xs text-gray-500">Teléfono</p>
                        </div>
                      </div>
                    )}

                    {order.customerDni && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-900">{order.customerDni}</p>
                          <p className="text-xs text-gray-500">DNI</p>
                        </div>
                      </div>
                    )}

                    {order.type === 'DELIVERY' && order.customerAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-gray-900">{order.customerAddress}</p>
                          <p className="text-xs text-gray-500">Dirección de entrega</p>
                        </div>
                      </div>
                    )}

                    {order.type === 'DELIVERY' && order.customerAddressReference && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-gray-900">{order.customerAddressReference}</p>
                          <p className="text-xs text-gray-500">Referencias Adicionales</p>
                        </div>
                      </div>
                    )}

                    {order.type === 'PARA_LLEVAR' && !order.customerName && !order.customerPhone && !order.customerDni && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-900">Cliente anónimo</p>
                          <p className="text-xs text-gray-500">Pedido para llevar</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {order.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Notas del Pedido</label>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-yellow-800">{order.notes}</p>
                    </div>
                  </div>
                )}

                {/* Información de Factura/Boleta */}
                {order.invoice && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">
                      Información del Comprobante
                    </label>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="space-y-3">
                        {/* Tipo y Número */}
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-blue-900 font-medium">
                              {order.invoice.type === 'BOLETA' ? 'Boleta' : 'Factura'} N° {order.invoice.number}
                            </p>
                            <p className="text-xs text-blue-600">
                              Emitida el {new Date(order.invoice.issuedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Datos del Cliente */}
                        {order.invoice.customerName && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-blue-900 font-medium">{order.invoice.customerName}</p>
                              <p className="text-xs text-blue-600">
                                {order.invoice.type === 'BOLETA' ? 'Cliente' : 'Razón Social'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* RUC para Facturas */}
                        {order.invoice.type === 'FACTURA' && order.invoice.customerRuc && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-blue-900 font-medium">{order.invoice.customerRuc}</p>
                              <p className="text-xs text-blue-600">RUC</p>
                            </div>
                          </div>
                        )}

                        {/* Dirección para Facturas */}
                        {order.invoice.type === 'FACTURA' && order.invoice.customerAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-blue-900">{order.invoice.customerAddress}</p>
                              <p className="text-xs text-blue-600">Dirección Fiscal</p>
                            </div>
                          </div>
                        )}

                        {/* Información de Pago */}
                        <div className="border-t border-blue-200 pt-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">Subtotal:</span>
                            <span className="text-sm font-medium text-blue-900">S/ {Number(order.invoice.subtotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">IGV:</span>
                            <span className="text-sm font-medium text-blue-900">S/ {Number(order.invoice.igv).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                            <span className="text-base font-medium text-blue-700">Total:</span>
                            <span className="text-base font-bold text-blue-900">S/ {Number(order.invoice.total).toFixed(2)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm text-blue-700">Método de Pago:</span>
                            <span className="text-sm font-medium text-blue-900">{order.invoice.paymentMethod}</span>
                          </div>
                          
                          {order.invoice.paymentMethod === 'EFECTIVO' && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-700">Monto Pagado:</span>
                                <span className="text-sm font-medium text-blue-900">S/ {Number(order.invoice.amountPaid).toFixed(2)}</span>
                              </div>
                              {Number(order.invoice.change) > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-700">Vuelto:</span>
                                  <span className="text-sm font-medium text-blue-900">S/ {Number(order.invoice.change).toFixed(2)}</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-blue-700">Emitido por:</span>
                            <span className="text-sm font-medium text-blue-900">{order.invoice.user.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total del Pedido */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-green-700">Total del Pedido</label>
                    <span className="text-xl font-bold text-green-600">
                      S/ {Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Acciones del Pedido */}
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600 mb-3 block">Acciones</label>
                  <div className="space-y-2">
                    {/* Botón Agregar Items - Solo si el pedido no está completado o cancelado */}
                    {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                      <Button
                        onClick={() => router.push(`/pedidos/${order.id}/edit`)}
                        variant="outline"
                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Items
                      </Button>
                    )}

                    {/* Botón Reenviar a Cocina - Para todos los pedidos excepto cancelados y cuando está en estado SERVED */}
                    {order.status !== 'CANCELLED' && order.status !== 'SERVED' && order.status !== 'COMPLETED' && (
                      <Button
                        onClick={handleShowKitchenPrintConfirm}
                        disabled={isPrintingKitchen}
                        variant="outline"
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                      >
                        {isPrintingKitchen ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                            Enviando...
                          </div>
                        ) : (
                          <>
                            <Printer className="h-4 w-4 mr-2" />
                            Reenviar a Cocina
                          </>
                        )}
                      </Button>
                    )}

                    {/* Pre-Boleta impresión directa */}
                    {order.status !== 'CANCELLED' && (
                      <Button
                        onClick={handlePrintPreReceipt}
                        disabled={isPrintingPreReceipt}
                        variant="outline"
                        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                      >
                        {isPrintingPreReceipt ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-700"></div>
                            Imprimiendo...
                          </div>
                        ) : (
                          <>Pre-Boleta</>
                        )}
                      </Button>
                    )}

                    {getNextStatusActions(order.status).map((action) => (
                      <Button
                        key={action.status}
                        onClick={() => {
                          if (action.action === 'markAllServed') {
                            markAllItemsAsServed()
                          } else if (action.action === 'complete') {
                            handleCompleteOrder()
                          } else if (action.action === 'cancel') {
                            handleCancelOrder()
                          } else {
                            changeOrderStatus(action.status)
                          }
                        }}
                        disabled={action.action === 'markAllServed' && isMarkingAllServed}
                        className={`w-full ${action.color}`}
                      >
                        {action.action === 'markAllServed' && isMarkingAllServed ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Marcando...
                          </div>
                        ) : (
                          action.label
                        )}
                      </Button>
                    ))}

                    {/* Botón de Impresión - Solo para pedidos completados */}
                    {order.status === 'COMPLETED' && (
                      <div className="pt-2">
                        <ThermalPrintButton 
                          order={order}
                          currentUser={{
                            id: session?.user?.id || '',
                            name: session?.user?.name || '',
                            role: session?.user?.role || ''
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items del Pedido */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Productos del Pedido</h2>
                <p className="text-sm text-gray-600">
                  Marca los productos como servidos cuando los entregues al cliente
                </p>
              </div>
              <div>
                <OrderItemsList
                  orderId={order.id}
                  items={order.orderItems}
                  onItemStatusChange={fetchOrder}
                  canMarkAsServed={!['COMPLETED', 'CANCELLED'].includes(order.status)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para completar pedido */}
      {selectedOrderToComplete && (
        <CompleteOrderModal
          isOpen={completeModalOpen}
          onClose={handleCloseCompleteModal}
          onComplete={processCompleteOrder}
          orderNumber={selectedOrderToComplete.orderNumber}
          totalAmount={Number(selectedOrderToComplete.totalAmount)}
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

      {/* Modal de confirmación para reenviar a cocina */}
      <ConfirmDialog
        isOpen={showKitchenPrintConfirm}
        onClose={() => setShowKitchenPrintConfirm(false)}
        onConfirm={handleConfirmPrintToKitchen}
        title="Reenviar a Cocina"
        description={`¿Estás seguro de que quieres reenviar la orden #${order?.orderNumber || ''} a la impresora de cocina?`}
        confirmText="Sí, reenviar"
        cancelText="Cancelar"
        variant="default"
      />


    </div>
  )
}