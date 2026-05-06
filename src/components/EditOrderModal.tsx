'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Minus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Decimal } from '@prisma/client/runtime/library'

interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  category: {
    id: string
    name: string
  }
  isAvailable: boolean
}

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
  status: string
  product: Product
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  startDate?: string
  endDate?: string
  notes?: string
  type: string
  table?: {
    id: string
    number: number
  }
  orderItems: OrderItem[]
  user: {
    id: string
    name: string
    role: string
  }
}

interface EditOrderModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onOrderUpdated: () => void
}

export default function EditOrderModal({ isOpen, onClose, order, onOrderUpdated }: EditOrderModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]) // Estructura unificada como en mesero

  // Función para generar ID único para nuevos items
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  useEffect(() => {
    if (isOpen && order) {
      loadProducts()
      initializeOrderData()
    }
  }, [isOpen, order])

  const initializeOrderData = () => {
    if (!order) return

    setOrderNotes(order.notes || '')
    
    // Separar items servidos de los editables y convertir valores numéricos
    const served = order.orderItems
      .filter(item => item.status === 'SERVED')
      .map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    
    const editable = order.orderItems
      .filter(item => item.status === 'PENDING')
      .map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    
    // Inicializar orderItems con todos los items existentes
    setOrderItems([...editable, ...served])
  }

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Error al cargar productos')
      
      const data = await response.json()
      const productsWithNumericPrices = data
        .filter((p: Product) => p.isAvailable)
        .map((p: Product) => ({
          ...p,
          price: Number(p.price)
        }))
      setProducts(productsWithNumericPrices)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar productos')
    } finally {
      setIsLoading(false)
    }
  }

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
      return
    }

    // Actualizar en orderItems
    const updatedItems = orderItems.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
        : item
    )
    setOrderItems(updatedItems)
    
    // Los items editables se manejan automáticamente a través de orderItems
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    const updatedItems = orderItems.map(item => 
      item.id === itemId ? { ...item, notes } : item
    )
    setOrderItems(updatedItems)
    
    // Los items editables se manejan automáticamente a través de orderItems
  }

  const removeItem = (itemId: string) => {
    const updatedItems = orderItems.filter(item => item.id !== itemId)
    setOrderItems(updatedItems)
  }

  const addProduct = (product: Product) => {
    // Verificar si el producto ya existe en orderItems
    const existingItemIndex = orderItems.findIndex(item => item.product.id === product.id && item.status !== 'SERVED')
    
    if (existingItemIndex !== -1) {
      // Si existe, incrementar cantidad
      const updatedItems = [...orderItems]
      const updatedItem = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1,
        subtotal: (updatedItems[existingItemIndex].quantity + 1) * updatedItems[existingItemIndex].unitPrice
      }
      updatedItems[existingItemIndex] = updatedItem
      setOrderItems(updatedItems)
    } else {
      // Si no existe, crear nuevo item
      const newItem: OrderItem = {
        id: generateTempId(),
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        notes: '',
        status: 'PENDING',
        product: product
      }
      
      const updatedItems = [...orderItems, newItem]
      setOrderItems(updatedItems)
    }
  }



  // Funciones obsoletas eliminadas - ahora todo se maneja con orderItems

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
  }

  // Agrupar productos por categoría
  const productsByCategory = products.reduce((acc, product) => {
    const categoryName = product.category.name
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  // Obtener categorías únicas
  const categories = Object.keys(productsByCategory)

  // Filtrar productos según la categoría seleccionada
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category.name === selectedCategory)

  const handleSave = async () => {
    if (!order) return

    try {
      setIsSaving(true)

      // Usar estructura unificada como en pedidos/[id]/edit
      const updateData = {
        notes: orderNotes,
        items: orderItems
          .filter(item => item.product?.id) // Filtrar items sin producto válido
          .map(item => ({
            id: item.id,
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes || '',
            status: item.status
          }))
      }

      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el pedido')
      }

      toast.success('Pedido actualizado exitosamente')
      onOrderUpdated()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar cambios')
    } finally {
      setIsSaving(false)
    }
  }

  if (!order) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            <span className="hidden sm:inline">Editar Pedido #{order.orderNumber}</span>
            <span className="sm:hidden">Editar #{order.orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Lista de Productos por Categorías */}
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Agregar Productos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Cargando productos...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Filtro de Categorías */}
                    <div className="mb-3 sm:mb-4">
                      <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                        <span className="hidden sm:inline">Filtrar por categoría:</span>
                        <span className="sm:hidden">Categoría:</span>
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2 sm:p-3 text-sm border rounded-lg bg-white"
                      >
                        <option value="all">Todas las categorías</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lista de Productos Filtrados */}
                    <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {filteredProducts.map((product) => (
                          <div 
                            key={product.id}
                            className="p-2 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => addProduct(product)}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-xs sm:text-sm truncate">{product.name}</h4>
                                <p className="text-xs text-gray-500 mb-1 truncate">{product.category.name}</p>
                                <p className="text-green-600 font-bold text-xs sm:text-sm">
                                  S/ {Number(product.price).toFixed(2)}
                                </p>
                              </div>
                              <Button size="sm" className="ml-1 sm:ml-2 h-6 sm:h-8 px-1 sm:px-2 text-xs shrink-0">
                                <span className="hidden sm:inline">+ Agregar</span>
                                <span className="sm:hidden">+</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredProducts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No hay productos disponibles en esta categoría
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel de Items del Pedido */}
          <div className="space-y-3 sm:space-y-4">
          {/* Items Servidos */}
          {orderItems.filter(item => item.status === 'SERVED').length > 0 && (
            <div>
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-green-600 text-base sm:text-lg">Items Servidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {orderItems.filter(item => item.status === 'SERVED').map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 bg-green-50 rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{item.product.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Cantidad: {item.quantity}</p>
                          {item.notes && (
                            <p className="text-xs sm:text-sm text-gray-500 italic break-words">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex justify-between sm:block sm:text-right shrink-0">
                          <p className="font-medium text-sm sm:text-base">S/ {Number(item.subtotal || 0).toFixed(2)}</p>
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                            Servido
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Items Editables */}
          <div>
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">
                  <span className="hidden sm:inline">Items del Pedido (Editables)</span>
                  <span className="sm:hidden">Items Editables</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {orderItems.filter(item => item.status !== 'SERVED').map((item) => (
                    <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg ${
                      item.id.startsWith('temp-') ? 'border-2 border-dashed border-blue-300 bg-blue-50' : ''
                    }`}>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{item.product.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">S/ {Number(item.unitPrice).toFixed(2)} c/u</p>
                        {item.id.startsWith('temp-') && (
                          <Badge variant="secondary" className="text-xs mt-1">Nuevo</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            className="rounded-xl h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, Number(e.target.value) || 1)}
                            className="w-12 sm:w-16 text-center text-sm"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="rounded-xl h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="text-right">
                             <p className="font-medium text-sm sm:text-base">S/ {Number(item.subtotal || 0).toFixed(2)}</p>
                           </div>
                           <Button
                             variant="destructive"
                             size="sm"
                             onClick={() => removeItem(item.id)}
                             className="rounded-xl h-8 w-8 p-0"
                           >
                             <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                           </Button>
                         </div>
                       </div>
                       <div className="w-full sm:w-32">
                         <Input
                           placeholder="Notas..."
                           value={item.notes || ''}
                           onChange={(e) => updateItemNotes(item.id, e.target.value)}
                           className="text-sm"
                         />
                       </div>
                     </div>
                  ))}

                  {/* Mensaje si no hay items editables */}
                  {orderItems.filter(item => item.status !== 'SERVED').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No hay items editables en este pedido.</p>
                      <p className="text-sm mt-1">Agrega productos desde la sección de la izquierda.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notas del Pedido */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Notas del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Agregar notas especiales para el pedido..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </CardContent>
            </Card>

            {/* Resumen y Acciones */}
            <Card className="mt-4 sm:mt-6">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className="text-base sm:text-lg font-semibold">Total:</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600">
                    S/ {Number(calculateTotal()).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl text-sm sm:text-base py-2 sm:py-3"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 rounded-xl text-sm sm:text-base py-2 sm:py-3"
                  >
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    <span className="sm:hidden">{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}