import { useState } from "react"
import { type CartItem, type CustomerData, type OrderType, type CreatedOrder, type Table } from "@/types"
import { useThermalPrinter } from "@/features/billing/components/PrintKitchenButton"
import { createOrderSchema } from "@/features/orders/validations/order"

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
  const [isPrintSkipped, setIsPrintSkipped] = useState(false)
  const [validationErrors, setValidationErrors] = useState<any[]>([])
  const { printOrder } = useThermalPrinter()

  const createOrder = async (props: UseCreateOrderProps) => {
    const { orderType, customerData, selectedTable, cartItems, notes, session } = props
    
    // Preparar datos para validación
    const orderData = {
      tableId: orderType === 'MESA' ? selectedTable?.id : undefined,
      type: orderType,
      customerName: customerData.name?.trim() || undefined,
      customerPhone: customerData.phone?.trim() || undefined,
      customerAddress: customerData.address?.trim() || undefined,
      customerAddressReference: customerData.addressReference?.trim() || undefined,
      notes: notes || undefined,
      items: cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || undefined
      }))
    }

    // Validar con Zod
    const validation = createOrderSchema.safeParse(orderData)
    if (!validation.success) {
      setValidationErrors(validation.error.issues)
      const firstError = validation.error.issues[0]
      alert(firstError.message)
      return
    }

    setValidationErrors([])
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
          const printResult = await printOrder(order.id, {
            tableNumber: orderType === 'MESA' ? selectedTable?.number?.toString() : orderType,
            waiterName: session?.user?.name || 'Sistema',
            isUrgent: false
          })
          setIsPrintSkipped(!!printResult?.skipped)
        } catch (printError: unknown) {
          setPrinterError(printError instanceof Error ? printError.message : 'No se pudo imprimir en la impresora de cocina.')
          setIsPrintSkipped(true)
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
    isPrintSkipped,
    createOrder
  }
}
