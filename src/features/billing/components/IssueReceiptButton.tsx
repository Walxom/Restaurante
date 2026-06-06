'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import IssueReceiptModal from './IssueReceiptModal'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  notes?: string
  customerName?: string
  customerDni?: string
  customerPhone?: string
  table?: {
    number: number
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string
    status: string
    product: {
      name: string
    }
  }>
  user: {
    name: string
  }
  invoice?: {
    id: string
    type: 'BOLETA' | 'FACTURA'
    number: string
  }
}

interface IssueReceiptButtonProps {
  order: Order
  onReceiptIssued?: () => void
  compact?: boolean
}

export default function IssueReceiptButton({ order, onReceiptIssued, compact = false }: IssueReceiptButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Solo mostrar el botón para pedidos completados SIN comprobante
  if (order.status !== 'COMPLETED' || order.invoice) {
    return null
  }

  const handleIssueReceipt = async (receiptType: 'boleta' | 'factura', customerData: {
    name: string
    document: string
    ruc?: string
  }) => {
    setIsProcessing(true)
    
    try {
      // Primero actualizar los datos del cliente en el pedido
      const updateResponse = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerDni: customerData.document,
          customerPhone: order.customerPhone || undefined
        })
      })

      if (!updateResponse.ok) {
        throw new Error('Error al actualizar datos del cliente')
      }

      // Luego crear el comprobante
      const invoiceResponse = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: receiptType.toUpperCase(),
          orderId: order.id,
          customerName: customerData.name,
          customerRuc: receiptType === 'factura' ? customerData.ruc : customerData.document,
          paymentMethod: 'EFECTIVO',
          amountPaid: Number(order.totalAmount)
        })
      })

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json()
        throw new Error(errorData.error || 'Error al crear el comprobante')
      }

      const invoiceData = await invoiceResponse.json()
      
      // Notificar que se emitió el comprobante
      if (onReceiptIssued) {
        onReceiptIssued()
      }

      // Mostrar mensaje de éxito
      alert(`${receiptType === 'boleta' ? 'Boleta' : 'Factura'} emitida exitosamente: ${invoiceData.number}`)
      
    } catch (error) {
      console.error('Error al emitir comprobante:', error)
      alert('Error al emitir el comprobante. Intente nuevamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={isProcessing}
        className={compact ? "h-7 px-2 text-xs" : ""}
      >
        <Printer className={compact ? "h-3 w-3" : "h-4 w-4"} />
        {!compact && (
          <span className="ml-2">
            {isProcessing ? 'Procesando...' : 'Emitir Comprobante'}
          </span>
        )}
        {compact && isProcessing && <span className="ml-1 text-xs">...</span>}
      </Button>

      <IssueReceiptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIssue={handleIssueReceipt}
        orderNumber={order.orderNumber}
        totalAmount={order.totalAmount}
      />
    </>
  )
}