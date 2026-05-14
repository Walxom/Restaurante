import { useState } from "react"
import { Order } from "@/types"

export function useOrderPrinting(order: Order | null) {
  const [isPrintingKitchen, setIsPrintingKitchen] = useState(false)
  const [isPrintingPreReceipt, setIsPrintingPreReceipt] = useState(false)

  const printToKitchen = async (waiterName: string) => {
    if (!order) return
    setIsPrintingKitchen(true)
    try {
      const response = await fetch('/api/thermal-print/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          tableNumber: order.table?.number?.toString() || 'N/A',
          waiterName: waiterName,
          isUrgent: false
        })
      })

      const result = await response.json()
      if (response.ok && result.success) {
        alert(`Orden #${order.orderNumber} enviada a cocina`)
        return true
      } else {
        throw new Error(result.error || 'Error enviando a cocina')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      return false
    } finally {
      setIsPrintingKitchen(false)
    }
  }

  const printPreReceipt = async () => {
    if (!order) return
    setIsPrintingPreReceipt(true)
    try {
      const response = await fetch('/api/thermal-print/pre-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })
      const result = await response.json()
      if (response.ok && result.success) {
        alert('Pre-Boleta enviada a la impresora de caja')
        return true
      } else {
        throw new Error(result.error || 'Error al imprimir Pre-Boleta')
      }
    } catch (err: any) {
      alert(err.message)
      return false
    } finally {
      setIsPrintingPreReceipt(false)
    }
  }

  return {
    isPrintingKitchen,
    isPrintingPreReceipt,
    printToKitchen,
    printPreReceipt
  }
}
