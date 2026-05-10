import { useState } from "react"
import { CartItem, CustomerData, OrderType, CreatedOrder, Table } from "@/types/orders"
import { useThermalPrinter } from "@/components/PrintKitchenButton"

interface UseCreateOrderProps {
  cartItems: CartItem[]
  orderType: OrderType
  customerData: CustomerData
  selectedTable: Table | null
  notes: string
  session: any
}

export function useCreateOrder() {
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [printerError, setPrinterError] = useState<string | null>(null)
  const { printOrder } = useThermalPrinter()

  const isValidOrder = (props: UseCreateOrderProps) => {
    const { orderType, customerData, selectedTable, cartItems } = props

    if ((orderType === 'PARA_LLEVAR' || orderType === 'DELIVERY') && !customerData.name.trim()) {
      alert("Para pedidos para llevar y delivery, el nombre del cliente es obligatorio")
      return false
    }
    
    if (orderType === 'MESA' && !selectedTable) {
      alert("Por favor, seleccione una mesa")
      return false
    }
    
    if (orderType === 'DELIVERY') {
      if (!customerData.phone.trim()) {
        alert("Para pedidos de delivery, el teléfono es obligatorio")
        return false
      }
      if (!customerData.address.trim()) {
        alert("Para pedidos de delivery, la dirección es obligatoria")
        return false
      }
    }
    
    if (cartItems.length === 0) {
      alert("Por favor, agregue al menos un producto al pedido")
      return false
    }
    
    return true
  }

  const createOrder = async (props: UseCreateOrderProps) => {
    if (!isValidOrder(props)) {
      return
    }

    const { orderType, customerData, selectedTable, cartItems, notes, session } = props
    
    setIsCreatingOrder(true)
    setPrinterError(null)

    try {
      const orderData = {
        tableId: orderType === 'MESA' ? selectedTable?.id : undefined,
        type: orderType,
        customerName: customerData.name.trim() || "CLIENTE",
        customerPhone: customerData.phone.trim() || undefined,
        customerAddress: customerData.address.trim() || undefined,
        customerAddressReference: customerData.addressReference.trim() || undefined,
        notes: notes || null,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || null
        }))
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const order = await response.json()
        
        // Impresión automática a cocina
        try {
          await printOrder(order.id, {
            tableNumber: orderType === 'MESA' ? selectedTable?.number?.toString() : orderType,
            waiterName: session?.user?.name || 'Sistema',
            isUrgent: false
          })
        } catch (printError: unknown) {
          setPrinterError(printError instanceof Error ? printError.message : 'No se pudo imprimir en la impresora de cocina.')
        }
        
        setCreatedOrder(order)
        setShowOrderModal(true)
        return order
      } else {
        const error = await response.json()
        alert(`Error al crear pedido: ${error.error}`)
      }
    } catch (error) {
      console.error("Error al crear pedido:", error)
      alert("Error al crear el pedido")
    } finally {
      setIsCreatingOrder(false)
    }
  }

  return {
    isCreatingOrder,
    showOrderModal,
    setShowOrderModal,
    createdOrder,
    printerError,
    setPrinterError,
    createOrder
  }
}
