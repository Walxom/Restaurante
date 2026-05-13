"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ShoppingCart, Clock, User, MapPin, Plus, Minus, Trash2, Search } from "lucide-react"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { Order, Product, OrderItem } from "@/types"

export default function EditOrderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [orderNotFound, setOrderNotFound] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [orderNotes, setOrderNotes] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Estados separados para items servidos y editables
  const [servedItems, setServedItems] = useState<OrderItem[]>([]) // Items ya servidos (solo lectura)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]) // Items editables (pendientes + nuevos)

  // Estados para modales
  const [modalState, setModalState] = useState({
    isOpen: false,
    variant: 'info' as 'success' | 'danger' | 'warning' | 'info' | 'primary',
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    showCancel: true
  })

  // Función para generar ID único
  const generateItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Función para mostrar modales
  const showModal = (config: any) => {
    const { type, ...rest } = config;
    let variant = 'info';
    if (type === 'error') variant = 'danger';
    else if (type === 'confirm') variant = 'primary';
    else if (type) variant = type;

    setModalState(prev => ({ ...prev, ...rest, variant, isOpen: true }))
  }

  // Función para cerrar modal
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "MESERO" && session.user.role !== "JEFE") {
      router.push("/dashboard")
    }
  }, [session, router])

  // Cargar datos iniciales
  useEffect(() => {
    if (orderId && session?.user?.id) {
      loadOrder()
      loadProducts()
    }
  }, [orderId, session])  // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const orderData = await response.json()
        setOrderNotFound(false)

        // Verificar permisos: JEFE y MESERO pueden editar pedidos creados por cualquiera de los dos roles
        if (session?.user?.role !== 'JEFE' && session?.user?.role !== 'MESERO') {
          showModal({
            type: 'error',
            title: 'Acceso Denegado',
            message: 'No tienes permisos para editar pedidos',
            onConfirm: () => router.push("/pedidos"),
            showCancel: false
          })
          return
        }

        // Verificar que el pedido fue creado por JEFE o MESERO
        const orderCreator = await fetch(`/api/users/${orderData.userId}`)
        if (orderCreator.ok) {
          const creatorData = await orderCreator.json()
          if (!['JEFE', 'MESERO'].includes(creatorData.role)) {
            showModal({
              type: 'error',
              title: 'Pedido No Editable',
              message: 'Este pedido no puede ser editado',
              onConfirm: () => router.push("/pedidos"),
              showCancel: false
            })
            return
          }
        }

        // Solo permitir edición si está PENDING, CONFIRMED o SERVED
        if (!['PENDING', 'CONFIRMED', 'SERVED'].includes(orderData.status)) {
          showModal({
            type: 'warning',
            title: 'Estado No Válido',
            message: 'Solo se pueden editar pedidos pendientes, confirmados o servidos',
            onConfirm: () => router.push("/pedidos"),
            showCancel: false
          })
          return
        }

        setOrder(orderData)
        setOrderNotes(orderData.notes || "")

        // Separar items servidos de items editables
        const served: OrderItem[] = []
        const editable: OrderItem[] = []

        orderData.orderItems.forEach((item: {
          id: string;
          productId: string;
          quantity: number;
          unitPrice: number;
          notes?: string;
          status: 'PENDING' | 'SERVED';
          product: { name: string; price: number; description?: string; categoryId?: string; category: { name: string } }
        }) => {
          const orderItem: OrderItem = {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: item.quantity * Number(item.unitPrice),
            notes: item.notes || "",
            status: item.status,
            product: {
              id: item.productId,
              name: item.product.name,
              price: Number(item.product.price),
              isAvailable: true,
              isActive: true,
              categoryId: item.product.categoryId || "",
            }
          }

          if (item.status === 'SERVED') {
            served.push(orderItem)
          } else {
            editable.push(orderItem)
          }
        })

        setServedItems(served)
        setOrderItems(editable)
      } else {
        if (response.status === 404) {
          setOrderNotFound(true)
        } else {
          showModal({
            type: 'error',
            title: 'Error de Carga',
            message: 'Error al cargar el pedido',
            onConfirm: () => router.push("/pedidos"),
            showCancel: false
          })
        }
      }
    } catch (error) {
      console.error("Error al cargar pedido:", error)
      showModal({
        type: 'error',
        title: 'Error de Conexión',
        message: 'Error al cargar el pedido. Verifica tu conexión a internet.',
        onConfirm: () => router.push("/pedidos"),
        showCancel: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.filter((p: Product) => p.isAvailable))
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addProduct = (product: Product) => {
    // Verificar si el producto ya existe en los items editables (no servidos)
    const existingItemIndex = orderItems.findIndex(item => item.productId === product.id)

    if (existingItemIndex !== -1) {
      // Si existe en items editables, incrementar la cantidad
      setOrderItems(prevItems =>
        prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      // Si no existe, agregar nuevo item (marcado como nuevo)
      const newItem: OrderItem = {
        id: generateItemId(),
        productId: product.id,
        quantity: 1,
        unitPrice: Number(product.price),
        subtotal: Number(product.price),
        notes: "",
        status: 'PENDING',
        isNew: true,
        product: product
      }
      setOrderItems(prevItems => [...prevItems, newItem])
    }
  }

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
      return
    }

    setOrderItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
          : item
      )
    )
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    setOrderItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, notes }
          : item
      )
    )
  }

  const removeItem = (itemId: string) => {
    setOrderItems(items => items.filter(item => item.id !== itemId))
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) =>
      total + (item.quantity * item.unitPrice), 0
    )
  }

  const calculateServedTotal = () => {
    return servedItems.reduce((total, item) =>
      total + (item.quantity * item.unitPrice), 0
    )
  }

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateServedTotal()
  }

  const saveOrder = async () => {
    // Permitir guardar incluso si no hay items editables (puede que solo haya items servidos)
    if (orderItems.length === 0 && servedItems.length === 0) {
      showModal({
        type: 'warning',
        title: 'Pedido Vacío',
        message: 'El pedido debe tener al menos un producto',
        showCancel: false
      })
      return
    }

    // Verificar si hay cambios significativos
    const originalItemsCount = order?.orderItems?.length || 0
    const currentItemsCount = orderItems.length
    const hasSignificantChanges = Math.abs(originalItemsCount - currentItemsCount) > 0

    if (hasSignificantChanges && ['CONFIRMED', 'SERVED'].includes(order?.status || '')) {
      let confirmMessage = ''
      let title = ''

      if (order?.status === 'CONFIRMED') {
        title = 'Modificar Pedido Confirmado'
        confirmMessage = `Este pedido ya está confirmado. ¿Estás seguro de que quieres modificarlo?\n\nLos cambios pueden afectar la preparación en cocina.`
      } else if (order?.status === 'SERVED') {
        title = 'Agregar Items a Pedido Servido'
        confirmMessage = `Este pedido ya está servido. ¿Estás seguro de que quieres agregar más items?\n\nEsto puede requerir preparación adicional en cocina.`
      }

      showModal({
        type: 'confirm',
        title,
        message: confirmMessage,
        onConfirm: () => performSaveOrder(),
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar'
      })
      return
    }

    performSaveOrder()
  }

  const performSaveOrder = async () => {
    setIsSaving(true)
    try {
      // Combinar items servidos y editables para enviar todos al backend
      const allItems = [
        // Items servidos (mantener tal como están)
        ...servedItems.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || null
        })),
        // Items editables (nuevos o modificados)
        ...orderItems.map(item => ({
          id: item.id.startsWith('item_') ? undefined : item.id, // Solo enviar ID si es un item existente
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || null
        }))
      ]

      const payload = {
        notes: orderNotes.trim() || null,
        items: allItems
      }

      console.log("Payload enviado:", payload)

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Redirección automática sin modal de éxito
        router.push(`/pedidos/${orderId}/detalles`)
      } else {
        const error = await response.json()
        showModal({
          type: 'error',
          title: 'Error al Guardar',
          message: `Error: ${error.error}`,
          showCancel: false
        })
      }
    } catch (error) {
      console.error("Error al guardar pedido:", error)
      showModal({
        type: 'error',
        title: 'Error de Conexión',
        message: 'Error al guardar el pedido. Verifica tu conexión a internet.',
        showCancel: false
      })
    } finally {
      setIsSaving(false)
    }
  }

  const cancelOrder = async () => {
    const confirmMessage = `¿Estás seguro de que quieres cancelar este pedido?\n\nPedido: #${order?.orderNumber}\n${order?.type === 'MESA' && order?.table ? `Mesa: ${order.table.number}` :
      order?.type === 'DELIVERY' ? '🚚 Delivery' :
        '🥡 Para llevar'}\nTotal: S/ ${order?.totalAmount ? Number(order.totalAmount).toFixed(2) : '0.00'}\n\nEsta acción no se puede deshacer.`

    showModal({
      type: 'confirm',
      title: 'Cancelar Pedido',
      message: confirmMessage,
      onConfirm: () => performCancelOrder(),
      confirmText: 'Sí, cancelar',
      cancelText: 'No cancelar'
    })
  }

  const performCancelOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        showModal({
          type: 'success',
          title: 'Pedido Cancelado',
          message: 'El pedido ha sido cancelado exitosamente',
          onConfirm: () => router.push(`/pedidos/${orderId}/detalles`),
          showCancel: false
        })
      } else {
        const error = await response.json()
        showModal({
          type: 'error',
          title: 'Error al Cancelar',
          message: `Error: ${error.error}`,
          showCancel: false
        })
      }
    } catch (error) {
      console.error("Error al cancelar pedido:", error)
      showModal({
        type: 'error',
        title: 'Error de Conexión',
        message: 'Error al cancelar el pedido. Verifica tu conexión a internet.',
        showCancel: false
      })
    }
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

  // Obtener categorías únicas
  const categories = Array.from(new Set(products.map(product => product.category?.name).filter(Boolean))) as string[]

  // Filtrar productos según la categoría seleccionada
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category?.name === selectedCategory)

  // Agrupar productos filtrados por categoría
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = product.category?.name || "Sin Categoría"
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(product)
    return acc
  }, {} as Record<string, Product[]>)

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
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={() => router.push(`/pedidos/${orderId}/detalles`)}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Pedidos</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {order.status === 'PENDING' ? 'Editar' :
                    order.status === 'CONFIRMED' ? 'Modificar' :
                      'Agregar Items a'} Pedido #{order.orderNumber}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'PREPARING' ? 'bg-orange-100 text-orange-800' :
                          order.status === 'READY' ? 'bg-green-100 text-green-800' :
                            order.status === 'SERVED' ? 'bg-gray-100 text-gray-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                    }`}>
                    {order.status === 'PENDING' ? 'Pendiente' :
                      order.status === 'CONFIRMED' ? 'Confirmado' :
                        order.status === 'PREPARING' ? 'Preparando' :
                          order.status === 'READY' ? 'Listo' :
                            order.status === 'SERVED' ? 'Servido' :
                              order.status === 'CANCELLED' ? 'Cancelado' :
                                order.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {order.type === 'MESA' && order.table ? (
                      <><MapPin className="w-3 h-3 inline mr-1" />Mesa {order.table.number}</>
                    ) : order.type === 'DELIVERY' ? (
                      <><User className="w-3 h-3 inline mr-1" />Delivery</>
                    ) : (
                      <><ShoppingCart className="w-3 h-3 inline mr-1" />Para llevar</>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Productos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtro de Categorías */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Filtrar Productos</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría:
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="all">Todas las categorías</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => setSelectedCategory('all')}
                      variant="outline"
                      className="px-4 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Limpiar filtro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {Object.entries(productsByCategory).length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay productos disponibles
                </h3>
                <p className="text-gray-600">
                  {selectedCategory === 'all'
                    ? 'No hay productos disponibles en este momento.'
                    : `No hay productos disponibles en la categoría "${selectedCategory}".`
                  }
                </p>
                {selectedCategory !== 'all' && (
                  <Button
                    onClick={() => setSelectedCategory('all')}
                    variant="outline"
                    className="mt-4"
                  >
                    Ver todas las categorías
                  </Button>
                )}
              </div>
            ) : (
              Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                    <p className="text-sm text-gray-600">Selecciona productos para agregar al pedido</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categoryProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{product.name}</h4>
                            <p className="text-green-600 font-semibold mt-1">
                              S/ {Number(product.price).toFixed(2)}
                            </p>
                          </div>
                          <Button size="sm" className="ml-3 bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Agregar</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Carrito */}
          <div className="space-y-6">
            {/* Items Ya Servidos */}
            {servedItems.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Items Ya Servidos
                  </h2>
                  <p className="text-sm text-gray-600">Estos items ya fueron entregados</p>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {servedItems.map((item) => (
                    <div key={item.id} className="border-b pb-3 last:border-b-0 bg-green-50 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm text-green-800">{item.product.name}</h4>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          SERVIDO
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-green-700">Cantidad: {item.quantity}</span>
                      </div>

                      {item.notes && (
                        <div className="text-xs text-green-600 mb-2 italic">
                          Notas: {item.notes}
                        </div>
                      )}

                      <div className="text-right">
                        <span className="font-semibold text-green-700">
                          S/ {(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-700">Subtotal Servido:</span>
                    <span className="text-green-600 font-semibold">S/ {calculateServedTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Items Editables (Nuevos/Pendientes) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  {orderItems.length > 0 ? 'Items Nuevos/Pendientes' : 'Agregar Items'}
                </h2>
                <p className="text-sm text-gray-600">
                  {orderItems.length > 0 ? 'Modifica o agrega nuevos productos' : 'Selecciona productos para agregar'}
                </p>
              </div>
              <div className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No hay productos nuevos en el pedido
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {orderItems.map((item) => (
                        <div key={item.id} className={`border border-gray-200 rounded-xl p-4 ${item.isNew ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm text-gray-900">{item.product.name}</h4>
                              {item.isNew && (
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                  NUEVO
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center bg-white px-2 py-1 rounded-lg border border-gray-200">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="mb-3">
                            <Input
                              placeholder="Notas especiales..."
                              value={item.notes || ""}
                              onChange={(e) => updateItemNotes(item.id, e.target.value)}
                              className="text-xs border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="text-right">
                            <span className="font-semibold text-blue-600">
                              S/ {(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal de Items Nuevos */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-700">Subtotal Nuevos:</span>
                        <span className="text-blue-600 font-semibold">
                          S/ {calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Total General */}
                {(servedItems.length > 0 || orderItems.length > 0) && (
                  <div className="border-t-2 border-gray-300 pt-4 mt-4 bg-gray-50 -mx-4 px-4 py-4 rounded-xl">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-gray-900">Total General:</span>
                      <span className="text-green-600">
                        S/ {calculateGrandTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notas del Pedido */}
                <div className="space-y-3 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas del Pedido
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Notas especiales para el pedido..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* Acciones */}
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <Button
                    onClick={saveOrder}
                    disabled={isSaving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </div>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>

                  {/* Solo mostrar cancelar si el pedido puede ser cancelado */}
                  {!['COMPLETED', 'SERVED', 'CANCELLED'].includes(order?.status || '') && (
                    <Button
                      onClick={cancelOrder}
                      variant="destructive"
                      className="w-full font-medium py-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md bg-red-600 hover:bg-red-700"
                    >
                      Cancelar Pedido
                    </Button>
                  )}

                  {/* Mostrar mensaje informativo si no se puede cancelar */}
                  {['COMPLETED', 'SERVED'].includes(order?.status || '') && (
                    <div className="text-sm text-gray-600 text-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Este pedido no puede ser cancelado porque ya está {order?.status === 'COMPLETED' ? 'completado' : 'servido'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Confirmación */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm || closeModal}
        title={modalState.title}
        description={modalState.message}
        variant={modalState.variant as any}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </div>
  )
}
