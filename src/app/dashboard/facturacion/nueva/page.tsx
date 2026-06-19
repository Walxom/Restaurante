"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { AdminPageHeader } from "@/components/layout/PageHeader"

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  customerName?: string
  table?: { number: number }
  orderItems: Array<{
    product: { name: string }
    quantity: number
    unitPrice: number
  }>
  createdAt: string
}

export default function NuevaFacturaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Datos de la factura
  const [invoiceType, setInvoiceType] = useState<"BOLETA" | "FACTURA">("BOLETA")
  const [customerName, setCustomerName] = useState("")
  const [customerRuc, setCustomerRuc] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO")
  const [amountPaid, setAmountPaid] = useState("")

  // Números correlativos
  const [nextNumbers, setNextNumbers] = useState<{
    BOLETA: string
    FACTURA: string
  }>({ BOLETA: "", FACTURA: "" })

  // Tasa de IGV configurada (no hardcodear). Por defecto 0.18 mientras carga.
  const [taxRate, setTaxRate] = useState(0.18)

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchCompletedOrders()
      fetchNextNumbers()
      fetchTaxRate()
    }
  }, [session])

  useEffect(() => {
    if (selectedOrder) {
      setAmountPaid(selectedOrder.totalAmount.toString())
    }
  }, [selectedOrder])

  const fetchCompletedOrders = async () => {
    try {
      const response = await fetch("/api/orders?status=COMPLETED&withoutInvoice=true&showAll=true")
      if (!response.ok) throw new Error("Error al cargar pedidos")

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError("Error al cargar los pedidos completados")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNextNumbers = async () => {
    try {
      const [boletaRes, facturaRes] = await Promise.all([
        fetch("/api/invoices/next-number?type=BOLETA"),
        fetch("/api/invoices/next-number?type=FACTURA")
      ])

      if (boletaRes.ok && facturaRes.ok) {
        const boletaData = await boletaRes.json()
        const facturaData = await facturaRes.json()
        
        setNextNumbers({
          BOLETA: boletaData.nextInvoiceNumber,
          FACTURA: facturaData.nextInvoiceNumber
        })
      }
    } catch (err) {
      console.error("Error fetching next numbers:", err)
    }
  }

  const fetchTaxRate = async () => {
    try {
      const res = await fetch("/api/system-config")
      if (!res.ok) return
      const cfg = await res.json()
      if (typeof cfg?.taxRate === "number") setTaxRate(cfg.taxRate)
    } catch (err) {
      console.error("Error fetching tax rate:", err)
    }
  }

  const calculateTotals = () => {
    if (!selectedOrder) return { subtotal: 0, igv: 0, total: 0 }

    const total = Number(selectedOrder.totalAmount)
    const subtotal = total / (1 + taxRate) // Quitar IGV con la tasa configurada
    const igv = total - subtotal

    return {
      subtotal: Number(subtotal.toFixed(2)),
      igv: Number(igv.toFixed(2)),
      total: Number(total.toFixed(2))
    }
  }

  const handleSubmit = async () => {
    if (!selectedOrder) {
      setError("Debe seleccionar un pedido")
      return
    }

    if (!paymentMethod || !amountPaid) {
      setError("Método de pago y monto pagado son requeridos")
      return
    }

    if (invoiceType === "FACTURA" && (!customerRuc || customerRuc.length !== 11)) {
      setError("RUC requerido y debe tener 11 dígitos para facturas")
      return
    }

    const totals = calculateTotals()
    const amountPaidNum = Number(amountPaid)

    if (amountPaidNum < totals.total) {
      setError("El monto pagado no puede ser menor al total")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          type: invoiceType,
          customerName: customerName.trim() || null,
          customerRuc: customerRuc.trim() || null,
          customerAddress: customerAddress.trim() || null,
          paymentMethod,
          amountPaid: amountPaidNum
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear la factura")
      }

      const invoice = await response.json()
      router.push(`/dashboard/facturacion/${invoice.id}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la factura")
    } finally {
      setSubmitting(false)
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

  if (session?.user?.role !== "JEFE") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              No tienes permisos para acceder a esta sección
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando pedidos...</p>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-background">
      <AdminPageHeader
        title="Nuevo Comprobante"
        subtitle="Generar boleta o factura desde pedido completado"
        backTo="/dashboard/facturacion"
      >
        <Button
          onClick={() => router.push("/dashboard/facturacion")}
          variant="outline"
          className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-9"
        >
          Cancelar
        </Button>
      </AdminPageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de pedidos completados */}
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Completados Sin Comprobante</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay pedidos completados sin comprobante
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            Pedido: {order.orderNumber}
                          </div>
                          {order.table && (
                            <div className="text-sm text-gray-500">
                              Mesa: {order.table.number}
                            </div>
                          )}
                          {order.customerName && (
                            <div className="text-sm text-gray-500">
                              Cliente: {order.customerName}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {formatCurrency(Number(order.totalAmount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.orderItems.length} items
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de facturación */}
          <Card>
            <CardHeader>
              <CardTitle>Datos de Facturación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Tipo de comprobante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Comprobante
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="BOLETA"
                      checked={invoiceType === "BOLETA"}
                      onChange={(e) => setInvoiceType(e.target.value as "BOLETA")}
                      className="mr-2"
                    />
                    Boleta ({nextNumbers.BOLETA})
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="FACTURA"
                      checked={invoiceType === "FACTURA"}
                      onChange={(e) => setInvoiceType(e.target.value as "FACTURA")}
                      className="mr-2"
                    />
                    Factura ({nextNumbers.FACTURA})
                  </label>
                </div>
              </div>

              {/* Datos del cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Cliente {invoiceType === "FACTURA" && "(Razón Social)"}
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={invoiceType === "BOLETA" ? "Cliente General (opcional)" : "Razón Social (requerido)"}
                />
              </div>

              {invoiceType === "FACTURA" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUC *
                    </label>
                    <Input
                      value={customerRuc}
                      onChange={(e) => setCustomerRuc(e.target.value.replace(/\D/g, ""))}
                      placeholder="20123456789"
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <Input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Dirección fiscal (opcional)"
                    />
                  </div>
                </>
              )}

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>

              {/* Monto pagado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Pagado *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Resumen de totales */}
              {selectedOrder && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Resumen del Pedido</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IGV:</span>
                      <span>{formatCurrency(totals.igv)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                    {amountPaid && Number(amountPaid) > totals.total && (
                      <div className="flex justify-between text-green-600">
                        <span>Vuelto:</span>
                        <span>{formatCurrency(Number(amountPaid) - totals.total)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items del pedido */}
              {selectedOrder && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Items del Pedido</h4>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!selectedOrder || submitting}
                className="w-full"
              >
                {submitting ? "Generando Comprobante..." : "Generar Comprobante"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
