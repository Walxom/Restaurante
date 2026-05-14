"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import ThermalPrintButton from "@/features/billing/components/ThermalPrintButton"
import { Order } from "@/types"
import { createMockOrder, createMockOrderItem } from "@/lib/type-converters"

interface Invoice {
  id: string
  number: string
  type: "BOLETA" | "FACTURA"
  customerName?: string
  customerRuc?: string
  customerAddress?: string
  subtotal: number
  igv: number
  total: number
  paymentMethod: string
  amountPaid: number
  change: number
  status: "ISSUED" | "CANCELLED"
  issuedAt: string
  cancelledAt?: string
  cancelReason?: string
  user: { name: string }
  order?: {
    id: string // ✅ Agregar el ID del pedido
    orderNumber: string
    table?: { number: number }
    orderItems?: Array<{
      id: string
      quantity: number
      unitPrice: number
      subtotal: number
      notes?: string
      status: string
      product: {
        name: string
        price: number
      }
    }>
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

export default function FacturaDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  
  // Resolver params como Promise
  const [invoiceId, setInvoiceId] = useState<string>("")

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setInvoiceId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (invoiceId && session?.user?.role === "JEFE") {
      fetchInvoice()
    }
  }, [invoiceId, session])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Factura no encontrada")
        }
        throw new Error("Error al cargar la factura")
      }

      const data = await response.json()
      setInvoice(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la factura")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setError("El motivo de anulación debe tener al menos 5 caracteres")
      return
    }

    setCancelling(true)
    setError(null)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "cancel",
          cancelReason: cancelReason.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al anular la factura")
      }

      const updatedInvoice = await response.json()
      setInvoice(updatedInvoice)
      setShowCancelModal(false)
      setCancelReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al anular la factura")
    } finally {
      setCancelling(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN"
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return <Badge variant="default" className="bg-green-500">Emitida</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Anulada</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "BOLETA":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Boleta</Badge>
      case "FACTURA":
        return <Badge variant="outline" className="border-green-500 text-green-700">Factura</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  if (session?.user?.role !== "JEFE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acceso Denegado</h3>
            <p className="text-gray-600">
              No tienes permisos para acceder a esta sección
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando comprobante...</p>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/dashboard/facturacion")} className="w-full">
              Volver a Comprobantes
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No encontrado</h3>
            <p className="text-gray-600">Comprobante no encontrado</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => router.push("/dashboard/facturacion")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Facturación</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {invoice.type}: {invoice.number}
                </h1>
                <p className="text-sm text-gray-600">
                  Emitida el {formatDate(invoice.issuedAt)} por {invoice.user.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Componente de impresión térmica - Solo si hay un pedido relacionado */}
              {invoice.order && (() => {
                // Crear un objeto orden mock para el ThermalPrintButton usando el pedido real
                const mockOrder = createMockOrder({
                  id: invoice.order.id,
                  orderNumber: invoice.order.orderNumber,
                  status: 'COMPLETED',
                  totalAmount: Number(invoice.total),
                  createdAt: invoice.issuedAt,
                  notes: `${invoice.type} - ${invoice.number}`,
                  customerName: invoice.customerName || null,
                  customerDni: invoice.customerRuc || null,
                  table: invoice.order.table ? { 
                    id: '', 
                    number: invoice.order.table.number,
                    status: 'OCUPADA',
                    capacity: 0
                  } : null,
                  orderItems: invoice.order.orderItems ? invoice.order.orderItems.map((item) => createMockOrderItem({
                    id: item.id,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    subtotal: Number(item.subtotal),
                    notes: item.notes || null,
                    status: item.status as any,
                    product: {
                      id: '',
                      name: item.product.name,
                      price: Number(item.product.price),
                      categoryId: '',
                      isAvailable: true,
                      isActive: true,
                      category: { id: '', name: '' }
                    },
                    createdAt: invoice.issuedAt
                  })) : invoice.items.map((item, index) => createMockOrderItem({
                    id: `item-${index}`,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    subtotal: Number(item.total),
                    notes: null,
                    status: 'SERVED',
                    product: {
                      id: '',
                      name: item.description,
                      price: Number(item.unitPrice),
                      categoryId: '',
                      isAvailable: true,
                      isActive: true,
                      category: { id: '', name: '' }
                    },
                    createdAt: invoice.issuedAt
                  })),
                  user: {
                    id: '',
                    name: invoice.user.name
                  },
                  invoice: {
                    id: invoice.id,
                    type: invoice.type as any,
                    number: invoice.number
                  }
                })

                return (
                  <ThermalPrintButton 
                    order={mockOrder}
                    size="sm"
                    variant="outline"
                    currentUser={session?.user ? {
                      id: session.user.id || '',
                      name: session.user.name || '',
                      role: session.user.role || ''
                    } : undefined}
                  />
                )
              })()}
              {invoice.status === "ISSUED" && (
                <Button 
                  onClick={() => setShowCancelModal(true)}
                  variant="destructive"
                  size="sm"
                >
                  Anular
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header de la factura */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeBadge(invoice.type)}
                    <span className="font-mono text-lg font-semibold">{invoice.number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Método: {invoice.paymentMethod}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {invoice.type === "FACTURA" ? "Razón Social" : "Nombre"}
                  </label>
                  <p className="font-medium text-gray-900 mt-1">
                    {invoice.customerName || "Cliente General"}
                  </p>
                </div>
                {invoice.customerRuc && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">RUC</label>
                    <p className="font-medium font-mono text-gray-900 mt-1">{invoice.customerRuc}</p>
                  </div>
                )}
                {invoice.customerAddress && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Dirección</label>
                    <p className="font-medium text-gray-900 mt-1">{invoice.customerAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items de la factura */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-600">Descripción</th>
                      <th className="text-center py-3 text-sm font-medium text-gray-600">Cant.</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-600">P. Unit.</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{item.description}</td>
                        <td className="text-center py-3 text-gray-900">{item.quantity}</td>
                        <td className="text-right py-3 text-gray-900">
                          {formatCurrency(Number(item.unitPrice))}
                        </td>
                        <td className="text-right py-3 font-medium text-gray-900">
                          {formatCurrency(Number(item.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Información lateral */}
          <div className="space-y-6">
            {/* Resumen de montos */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Montos</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(Number(invoice.subtotal))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IGV:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(Number(invoice.igv))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-green-600">
                    {formatCurrency(Number(invoice.total))}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pagado:</span>
                    <span className="text-gray-900">{formatCurrency(Number(invoice.amountPaid))}</span>
                  </div>
                  {invoice.change > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Vuelto:</span>
                      <span className="font-medium">{formatCurrency(Number(invoice.change))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información del pedido */}
            {invoice.order && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedido Relacionado</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Número de Pedido
                    </label>
                    <p className="font-medium font-mono text-gray-900 mt-1">
                      {invoice.order.orderNumber}
                    </p>
                  </div>
                  {invoice.order.table && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Mesa
                      </label>
                      <p className="font-medium text-gray-900 mt-1">
                        Mesa {invoice.order.table.number}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estado de anulación */}
            {invoice.status === "CANCELLED" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-red-700 mb-4">Factura Anulada</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Fecha de Anulación
                    </label>
                    <p className="font-medium text-gray-900 mt-1">
                      {invoice.cancelledAt && formatDate(invoice.cancelledAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Motivo
                    </label>
                    <p className="text-red-600 mt-1 font-medium">
                      {invoice.cancelReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de anulación */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-lg border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Anular Factura</h3>
                <p className="text-gray-600 mb-4">
                  ¿Estás seguro de que deseas anular esta factura? Esta acción no se puede deshacer.
                </p>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de la anulación *
                  </label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describe el motivo de la anulación..."
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCancelInvoice}
                    disabled={cancelling || cancelReason.trim().length < 5}
                    variant="destructive"
                    className="flex-1"
                  >
                    {cancelling ? "Anulando..." : "Anular Factura"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCancelModal(false)
                      setCancelReason("")
                      setError(null)
                    }}
                    variant="outline"
                    disabled={cancelling}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
