"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, ShoppingCart, ArrowRight, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface OrderCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  orderNumber: string
  orderId: string
  orderType: string
  tableNumber?: number
  totalAmount: number
}

export default function OrderCreatedModal({
  isOpen,
  onClose,
  orderNumber,
  orderId,
  orderType,
  tableNumber,
  totalAmount
}: OrderCreatedModalProps) {
  const router = useRouter()
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true)
    }
  }, [isOpen])

  const handleViewOrder = () => {
    router.push(`/pedidos/${orderId}/detalles`)
    onClose()
  }

  const handleBackToOrders = () => {
    router.push("/pedidos")
    onClose()
  }

  const handleModalClose = () => {
    // Si el modal se cierra sin seleccionar un botón específico,
    // redirigir a la lista de pedidos
    router.push("/pedidos")
    onClose()
  }

  const getOrderTypeDisplay = () => {
    switch (orderType) {
      case 'MESA':
        return `Mesa ${tableNumber}`
      case 'DELIVERY':
        return '🚚 Delivery'
      case 'PARA_LLEVAR':
        return '🥡 Para llevar'
      default:
        return orderType
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Pedido Creado Exitosamente</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 space-y-6">
          {/* Animación del check */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-green-500 rounded-full w-20 h-20 flex items-center justify-center">
              <Check className="h-10 w-10 text-white animate-bounce" />
            </div>
          </div>

          {/* Mensaje principal */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-green-600">
              ¡Pedido creado exitosamente!
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Número de pedido:</span>
                <span className="font-bold text-lg text-gray-900">#{orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium text-gray-900">{getOrderTypeDisplay()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg text-green-600">S/ {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShoppingCart className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-800">
                  El pedido ha sido enviado a cocina
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Puedes ver el estado y gestionar el pedido desde la lista de pedidos
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <Button
              onClick={handleViewOrder}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-medium"
            >
              <Eye className="h-5 w-5 mr-2" />
              Ver detalles del pedido
            </Button>
            
            <Button
              onClick={handleBackToOrders}
              variant="outline"
              className="w-full py-3 text-base font-medium"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Ir a lista de pedidos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}