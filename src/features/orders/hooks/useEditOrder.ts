import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Order, Product, OrderItem } from "@/types"

interface DialogState {
  isOpen: boolean
  title: string
  description: string
  variant: "default" | "destructive" | "success"
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
}

export function useEditOrder(orderId: string) {
  const { data: session } = useSession()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [orderNotFound, setOrderNotFound] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [orderNotes, setOrderNotes] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Estados separados para items servidos y editables
  const [servedItems, setServedItems] = useState<OrderItem[]>([]) // Items ya servidos (solo lectura)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]) // Items editables (pendientes + nuevos)

  // Estado para diálogos de confirmación
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const showConfirmDialog = (config: Omit<DialogState, "isOpen">) => {
    setDialog({ ...config, isOpen: true })
  }

  const closeDialog = () => {
    setDialog(null)
  }

  // Generar ID único temporal para nuevos items
  const generateItemId = () => `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Cargar pedido y catálogo de productos
  const loadOrder = useCallback(async () => {
    if (!orderId || !session?.user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const orderData = await response.json()
        setOrderNotFound(false)

        // Verificar permisos de edición: solo JEFE o MESERO
        if (session.user.role !== "JEFE" && session.user.role !== "MESERO") {
          showConfirmDialog({
            title: "Acceso Denegado",
            description: "No tienes permisos para editar pedidos.",
            variant: "destructive",
            confirmText: "Aceptar",
            onConfirm: () => {
              closeDialog()
              router.push("/pedidos")
            }
          })
          return
        }

        // Verificar que el pedido fue creado por JEFE o MESERO
        const orderCreatorRes = await fetch(`/api/users/${orderData.userId}`)
        if (orderCreatorRes.ok) {
          const creatorData = await orderCreatorRes.json()
          if (!["JEFE", "MESERO"].includes(creatorData.role)) {
            showConfirmDialog({
              title: "Pedido No Editable",
              description: "Este pedido no puede ser editado.",
              variant: "destructive",
              confirmText: "Aceptar",
              onConfirm: () => {
                closeDialog()
                router.push("/pedidos")
              }
            })
            return
          }
        }

        // Solo permitir edición si está PENDING, CONFIRMED o SERVED
        if (!["PENDING", "CONFIRMED", "SERVED"].includes(orderData.status)) {
          showConfirmDialog({
            title: "Estado No Válido",
            description: "Solo se pueden editar pedidos pendientes, confirmados o servidos.",
            variant: "destructive",
            confirmText: "Aceptar",
            onConfirm: () => {
              closeDialog()
              router.push("/pedidos")
            }
          })
          return
        }

        setOrder(orderData)
        setOrderNotes(orderData.notes || "")

        // Separar items servidos de items editables
        const served: OrderItem[] = []
        const editable: OrderItem[] = []

        orderData.orderItems.forEach((item: any) => {
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

          if (item.status === "SERVED") {
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
          showConfirmDialog({
            title: "Error de Carga",
            description: "Error al cargar el pedido.",
            variant: "destructive",
            confirmText: "Aceptar",
            onConfirm: () => {
              closeDialog()
              router.push("/pedidos")
            }
          })
        }
      }
    } catch (error) {
      console.error("Error al cargar pedido:", error)
      showConfirmDialog({
        title: "Error de Conexión",
        description: "Error al cargar el pedido. Verifica tu conexión.",
        variant: "destructive",
        confirmText: "Aceptar",
        onConfirm: () => {
          closeDialog()
          router.push("/pedidos")
        }
      })
    } finally {
      setIsLoading(false)
    }
  }, [orderId, session, router])

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.filter((p: Product) => p.isAvailable))
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    }
  }, [])

  // Inicialización de datos
  useEffect(() => {
    if (orderId && session?.user?.id) {
      loadOrder()
      loadProducts()
    }
  }, [orderId, session, loadOrder, loadProducts])

  // Lógica del Carrito
  const addProduct = (product: Product) => {
    const existingItemIndex = orderItems.findIndex(item => item.productId === product.id)

    if (existingItemIndex !== -1) {
      setOrderItems(prevItems =>
        prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
            : item
        )
      )
    } else {
      const newItem: OrderItem = {
        id: generateItemId(),
        productId: product.id,
        quantity: 1,
        unitPrice: Number(product.price),
        subtotal: Number(product.price),
        notes: "",
        status: "PENDING",
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

  // Cálculos de Totales
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0)
  }

  const calculateServedTotal = () => {
    return servedItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0)
  }

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateServedTotal()
  }

  // Operaciones de API de Pedido
  const saveOrder = async () => {
    if (orderItems.length === 0 && servedItems.length === 0) {
      showConfirmDialog({
        title: "Pedido Vacío",
        description: "El pedido debe tener al menos un producto.",
        variant: "destructive",
        confirmText: "Aceptar",
        onConfirm: () => closeDialog()
      })
      return
    }

    // Verificar si hay cambios significativos
    const originalItemsCount = order?.orderItems?.length || 0
    const currentItemsCount = orderItems.length
    const hasSignificantChanges = Math.abs(originalItemsCount - currentItemsCount) > 0

    if (hasSignificantChanges && ["CONFIRMED", "SERVED"].includes(order?.status || "")) {
      let confirmMessage = ""
      let title = ""

      if (order?.status === "CONFIRMED") {
        title = "Modificar Pedido Confirmado"
        confirmMessage = "Este pedido ya está confirmado. ¿Estás seguro de que quieres modificarlo?\n\nLos cambios pueden afectar la preparación en cocina."
      } else if (order?.status === "SERVED") {
        title = "Agregar Items a Pedido Servido"
        confirmMessage = "Este pedido ya está servido. ¿Estás seguro de que quieres agregar más items?\n\nEsto puede requerir preparación adicional en cocina."
      }

      showConfirmDialog({
        title,
        description: confirmMessage,
        variant: "destructive",
        confirmText: "Sí, continuar",
        cancelText: "Cancelar",
        onConfirm: () => {
          closeDialog()
          performSaveOrder()
        }
      })
      return
    }

    performSaveOrder()
  }

  const performSaveOrder = async () => {
    setIsSaving(true)
    try {
      const allItems = [
        ...servedItems.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || null
        })),
        ...orderItems.map(item => ({
          id: item.id.startsWith("item_") ? undefined : item.id,
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

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        router.push(`/pedidos/${orderId}/detalles`)
      } else {
        const error = await response.json()
        showConfirmDialog({
          title: "Error al Guardar",
          description: `Error: ${error.error}`,
          variant: "destructive",
          confirmText: "Aceptar",
          onConfirm: () => closeDialog()
        })
      }
    } catch (error) {
      console.error("Error al guardar pedido:", error)
      showConfirmDialog({
        title: "Error de Conexión",
        description: "Error al guardar el pedido. Verifica tu conexión.",
        variant: "destructive",
        confirmText: "Aceptar",
        onConfirm: () => closeDialog()
      })
    } finally {
      setIsSaving(false)
    }
  }

  const cancelOrder = async () => {
    const confirmMessage = `¿Estás seguro de que quieres cancelar este pedido?\n\nPedido: #${order?.orderNumber}\n${
      order?.type === "MESA" && order?.table ? `Mesa: ${order.table.number}` :
      order?.type === "DELIVERY" ? "🚚 Delivery" : "🥡 Para llevar"
    }\nTotal: S/ ${order?.totalAmount ? Number(order.totalAmount).toFixed(2) : "0.00"}\n\nEsta acción no se puede deshacer.`

    showConfirmDialog({
      title: "Cancelar Pedido",
      description: confirmMessage,
      variant: "destructive",
      confirmText: "Sí, cancelar",
      cancelText: "No cancelar",
      onConfirm: () => {
        closeDialog()
        performCancelOrder()
      }
    })
  }

  const performCancelOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        showConfirmDialog({
          title: "Pedido Cancelado",
          description: "El pedido ha sido cancelado exitosamente.",
          variant: "success",
          confirmText: "Aceptar",
          onConfirm: () => {
            closeDialog()
            router.push(`/pedidos/${orderId}/detalles`)
          }
        })
      } else {
        const error = await response.json()
        showConfirmDialog({
          title: "Error al Cancelar",
          description: `Error: ${error.error}`,
          variant: "destructive",
          confirmText: "Aceptar",
          onConfirm: () => closeDialog()
        })
      }
    } catch (error) {
      console.error("Error al cancelar pedido:", error)
      showConfirmDialog({
        title: "Error de Conexión",
        description: "Error al cancelar el pedido. Verifica tu conexión.",
        variant: "destructive",
        confirmText: "Aceptar",
        onConfirm: () => closeDialog()
      })
    }
  }

  return {
    order,
    products,
    isLoading,
    orderNotFound,
    isSaving,
    orderNotes,
    setOrderNotes,
    selectedCategory,
    setSelectedCategory,
    servedItems,
    orderItems,
    dialog,
    closeDialog,
    addProduct,
    updateItemQuantity,
    updateItemNotes,
    removeItem,
    calculateTotal,
    calculateServedTotal,
    calculateGrandTotal,
    saveOrder,
    cancelOrder
  }
}
