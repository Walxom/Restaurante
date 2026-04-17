"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface OrderCartProps {
  items: CartItem[]
  selectedTable: Table | null
  onUpdateItem: (productId: string, quantity: number, notes?: string) => void
  onRemoveItem: (productId: string) => void
  total: number
  onCreateOrder: () => void
  isCreating: boolean
  orderType?: 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'
}

export default function OrderCart({ 
  items, 
  selectedTable, 
  onUpdateItem, 
  onRemoveItem, 
  total, 
  onCreateOrder, 
  isCreating,
  orderType = 'MESA'
}: OrderCartProps) {
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(productId)
    } else {
      const item = items.find(i => i.productId === productId)
      onUpdateItem(productId, newQuantity, item?.notes)
    }
  }

  const updateNotes = (productId: string, notes: string) => {
    const item = items.find(i => i.productId === productId)
    if (item) {
      onUpdateItem(productId, item.quantity, notes)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pedido</span>
          <span className="text-sm font-normal text-gray-600">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Información de Mesa - Solo para pedidos tipo MESA */}
        {orderType === 'MESA' && (
          selectedTable ? (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-900">Mesa {selectedTable.number}</div>
              <div className="text-sm text-blue-700">
                Capacidad: {selectedTable.capacity} {selectedTable.capacity === 1 ? "persona" : "personas"}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="font-medium text-yellow-800">⚠️ Selecciona una mesa</div>
              <div className="text-sm text-yellow-700">
                Necesitas seleccionar una mesa antes de crear el pedido
              </div>
            </div>
          )
        )}

        {/* Información para otros tipos de pedido */}
        {orderType === 'PARA_LLEVAR' && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="font-medium text-green-900">🥡 Para Llevar</div>
            <div className="text-sm text-green-700">
              Pedido listo para recoger en mostrador
            </div>
          </div>
        )}

        {orderType === 'DELIVERY' && (
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="font-medium text-purple-900">🚚 Delivery</div>
            <div className="text-sm text-purple-700">
              Pedido con entrega a domicilio
            </div>
          </div>
        )}

        {/* Items del Carrito */}
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🛒</div>
            <div className="font-medium">Carrito vacío</div>
            <div className="text-sm">Agrega productos para comenzar</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="bg-gray-50 p-3 rounded-lg">
                {/* Header del Item */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      S/ {Number(item.price).toFixed(2)} c/u
                    </div>
                  </div>
                  <Button
                    onClick={() => onRemoveItem(item.productId)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>

                {/* Controles de Cantidad */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      -
                    </Button>
                    <span className="mx-2 min-w-[25px] text-center font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      +
                    </Button>
                  </div>
                  <div className="font-medium text-gray-900">
                    S/ {(Number(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Notas del Item */}
                <Input
                  placeholder="Notas especiales..."
                  value={item.notes || ""}
                  onChange={(e) => updateNotes(item.productId, e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            ))}
          </div>
        )}

        {/* Resumen Total */}
        {items.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-green-600">
                S/ {Number(total).toFixed(2)}
              </span>
            </div>

            {/* Botón Crear Pedido */}
            <Button
              onClick={onCreateOrder}
              disabled={(orderType === 'MESA' && !selectedTable) || items.length === 0 || isCreating}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              size="lg"
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creando Pedido...
                </div>
              ) : (
                `Crear Pedido - S/ ${Number(total).toFixed(2)}`
              )}
            </Button>

            {/* Mensajes de Validación */}
            {orderType === 'MESA' && !selectedTable && items.length > 0 && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Selecciona una mesa para continuar
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
