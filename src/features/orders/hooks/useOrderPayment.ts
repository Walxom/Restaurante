import { useState } from "react"
import { Order } from "@/types"

interface CustomerData {
  name?: string
  document?: string
  ruc?: string
}

export function useOrderPayment(order: Order | null, onPaymentSuccess: () => void) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)

  const processCompleteOrder = async (receiptType: string, customerData?: CustomerData) => {
    if (!order) return null

    setIsProcessing(true)
    try {
      // 1. Actualizar datos del cliente si es necesario
      if (customerData && (customerData.name || customerData.document)) {
        await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerData.name || order.customerName,
            customerDni: customerData.document || order.customerDni
          })
        })
      }

      // 2. Cambiar estado a COMPLETADO
      const statusRes = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (!statusRes.ok) {
        const err = await statusRes.json()
        throw new Error(err.error || "Error al completar pedido")
      }

      let receiptNumber = null

      // 3. Generar Comprobante (Boleta/Factura)
      if (receiptType !== 'none') {
        const invoiceRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: receiptType.toUpperCase(),
            orderId: order.id,
            customerName: customerData?.name || 'Cliente',
            customerDocument: customerData?.document || '',
            customerRuc: customerData?.ruc || '',
            paymentMethod: 'EFECTIVO', // Por defecto, se puede expandir
            amountPaid: Number(order.totalAmount)
          })
        })

        if (invoiceRes.ok) {
          const invoice = await invoiceRes.json()
          receiptNumber = invoice.number
        } else {
          throw new Error("Error al generar el comprobante")
        }
      }

      onPaymentSuccess()
      return receiptNumber
    } catch (err: any) {
      console.error(err)
      alert(err.message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    isProcessing,
    completeModalOpen,
    setCompleteModalOpen,
    processCompleteOrder
  }
}
