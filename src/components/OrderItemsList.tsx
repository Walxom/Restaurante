"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Clock, ChefHat, Utensils, Undo2 } from "lucide-react"

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
  status: string
  product: {
    name: string
  }
}

interface OrderItemsListProps {
  orderId: string
  items: OrderItem[]
  onItemStatusChange: () => void
  canMarkAsServed?: boolean
}

export default function OrderItemsList({ 
  orderId, 
  items, 
  onItemStatusChange,
  canMarkAsServed = true 
}: OrderItemsListProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId))
    
    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        onItemStatusChange()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error al actualizar estado del item:', error)
      alert('Error al actualizar el estado del producto')
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'SERVED':
        return <Check className="h-4 w-4 text-green-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'SERVED':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente'
      case 'SERVED':
        return 'Servido'
      default:
        return status
    }
  }

  const canMarkAsServedItem = (status: string) => {
    return canMarkAsServed && status === 'PENDING'
  }

  const canUndoServedItem = (status: string) => {
    return canMarkAsServed && status === 'SERVED'
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="border-l-4 border-l-blue-500 overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {getStatusIcon(item.status)}
                    <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                      {item.product.name}
                    </h4>
                    <span className="text-gray-600 text-sm flex-shrink-0">x{item.quantity}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)} flex-shrink-0 w-fit`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
                
                {item.notes && (
                  <div className="text-xs sm:text-sm text-gray-600 mb-2 ml-0 sm:ml-7 break-words">
                    📝 {item.notes}
                  </div>
                )}
                
                <div className="text-xs sm:text-sm text-gray-500 ml-0 sm:ml-7">
                  S/ {Number(item.unitPrice).toFixed(2)} c/u • Total: S/ {Number(item.subtotal).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 justify-end sm:justify-start">
                {canMarkAsServedItem(item.status) && (
                  <Button
                    onClick={() => updateItemStatus(item.id, 'SERVED')}
                    disabled={updatingItems.has(item.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    size="sm"
                  >
                    {updatingItems.has(item.id) ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Marcar Servido</span>
                        <span className="sm:hidden">Servido</span>
                      </>
                    )}
                  </Button>
                )}
                
                {canUndoServedItem(item.status) && (
                  <Button
                    onClick={() => updateItemStatus(item.id, 'PENDING')}
                    disabled={updatingItems.has(item.id)}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    size="sm"
                  >
                    {updatingItems.has(item.id) ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-orange-600"></div>
                    ) : (
                      <>
                        <Undo2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Deshacer</span>
                        <span className="sm:hidden">Deshacer</span>
                      </>
                    )}
                  </Button>
                )}
                
                {item.status === 'SERVED' && !canUndoServedItem(item.status) && (
                  <div className="flex items-center text-purple-600 text-xs sm:text-sm font-medium">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Servido</span>
                    <span className="sm:hidden">✓</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}