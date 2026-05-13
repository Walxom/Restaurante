import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useOrdersSocket } from "@/hooks/useSocket"
import { Order, OrderStatus } from "@/types"

export function useOrderDetail(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingAllServed, setIsMarkingAllServed] = useState(false)
  const router = useRouter()

  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setError(null)
      } else if (response.status === 404) {
        setError("NOT_FOUND")
      } else {
        setError("FETCH_ERROR")
      }
    } catch (err) {
      console.error("Error al cargar pedido:", err)
      setError("CONNECTION_ERROR")
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  // Sincronización en tiempo real
  const handleOrderUpdated = useCallback((updatedOrder: any) => {
    if (updatedOrder.id === orderId) fetchOrder()
  }, [orderId, fetchOrder])

  const handleOrderItemUpdate = useCallback((data: any) => {
    if (data.orderId === orderId) fetchOrder()
  }, [orderId, fetchOrder])

  const { isConnected } = useOrdersSocket({
    onOrderUpdated: handleOrderUpdated,
    onOrderItemUpdate: handleOrderItemUpdate,
    onOrderStatusChanged: handleOrderUpdated
  })

  const updateStatus = async (newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchOrder()
        return true
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
        return false
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err)
      return false
    }
  }

  const markAllItemsAsServed = async () => {
    if (isMarkingAllServed) return
    setIsMarkingAllServed(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/items/mark-all-served`, {
        method: "PATCH"
      })
      if (response.ok) {
        await fetchOrder()
      } else {
        const err = await response.json()
        alert(`Error: ${err.error}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsMarkingAllServed(false)
    }
  }

  const hasPendingItems = useCallback(() => {
    return order?.orderItems?.some((item: any) => item.status === 'PENDING')
  }, [order])

  const canCancelOrder = useCallback(() => {
    return order && !['COMPLETED', 'CANCELLED'].includes(order.status) && 
           !order.orderItems?.some((item: any) => item.status === 'SERVED')
  }, [order])

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'CONFIRMED': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'SERVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'COMPLETED': return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
      case 'CANCELLED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      case 'PREPARING': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
      case 'READY': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'PAID': return 'bg-green-500/10 text-green-500 border-green-500/20'
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }
  }

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'CONFIRMED': return 'Confirmado'
      case 'PREPARING': return 'Preparando'
      case 'READY': return 'Listo'
      case 'SERVED': return 'Servido'
      case 'PAID': return 'Pagado'
      case 'COMPLETED': return 'Completado'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  const getNextStatusActions = (status: OrderStatus) => {
    const actions: Array<{ status: OrderStatus; label: string; color: string; action: string }> = []
    switch (status) {
      case 'PENDING':
        actions.push({ status: 'CONFIRMED', label: 'Confirmar Pedido', color: 'bg-blue-600 hover:bg-blue-700', action: 'status' })
        break
      case 'CONFIRMED':
        if (hasPendingItems()) {
          actions.push({ status: 'SERVED', label: 'Marcar Todo Servido', color: 'bg-emerald-600 hover:bg-emerald-700', action: 'markAllServed' })
        }
        break
      case 'SERVED':
        actions.push({ status: 'COMPLETED', label: 'Completar y Cobrar', color: 'bg-slate-600 hover:bg-slate-700', action: 'complete' })
        break
    }
    if (canCancelOrder() && status !== 'COMPLETED' && status !== 'CANCELLED') {
      actions.push({ status: 'CANCELLED', label: 'Cancelar Pedido', color: 'bg-rose-600 hover:bg-rose-700', action: 'cancel' })
    }
    return actions
  }

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  return {
    order,
    isLoading,
    error,
    isConnected,
    isMarkingAllServed,
    refreshOrder: fetchOrder,
    updateStatus,
    markAllItemsAsServed,
    hasPendingItems,
    canCancelOrder,
    getStatusColor,
    getStatusText,
    getNextStatusActions
  }
}

