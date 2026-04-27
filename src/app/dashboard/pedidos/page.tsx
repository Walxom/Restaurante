"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  type: string
  table?: {
    number: number
  }
  user: {
    name: string
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    product: {
      name: string
    }
  }>
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "JEFE") {
      router.push("/mesero")
    }
  }, [session, router])

  // Cargar pedidos
  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders?showAll=true")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'SERVED': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Cargando pedidos...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-600 mt-1">Vista general de todos los pedidos del sistema</p>
        </div>
        
        <Button 
          onClick={() => router.push("/dashboard")}
          variant="outline"
        >
          Volver al Dashboard
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay pedidos</h3>
            <p className="text-gray-600">Aún no se han creado pedidos en el sistema.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Pedido #{order.orderNumber}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.type === 'MESA' && order.table ? `Mesa ${order.table.number}` : 
                       order.type === 'DELIVERY' ? '🚚 Delivery' : 
                       '🥡 Para llevar'} • 
                      Mesero: {order.user.name} • 
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium">{item.product.name}</span>
                        <span className="text-gray-600 ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-medium">
                        S/ {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-lg">Total:</span>
                  <span className="font-bold text-xl text-green-600">
                    S/ {Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
