"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useRouter } from "next/navigation"
import CreateInvoiceModal from "@/components/CreateInvoiceModal"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import { FileText, Plus, ArrowLeft, X } from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"

interface Invoice {
  id: string
  number: string
  type: "BOLETA" | "FACTURA"
  customerName?: string
  customerRuc?: string
  total: number
  paymentMethod: string
  status: "ISSUED" | "CANCELLED"
  issuedAt: string
  user: { name: string }
  order?: {
    orderNumber: string
    table?: { number: number }
  }
}

interface InvoiceStats {
  summary: {
    totalInvoices: number
    totalRevenue: number
    averageTicket: number
  }
  byType: Array<{
    type: string
    count: number
    revenue: number
  }>
  byPaymentMethod: Array<{
    method: string
    count: number
    revenue: number
  }>
}

export default function FacturacionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)
  
  // Filtros
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [withoutReceiptFilter, setWithoutReceiptFilter] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchInvoices = useCallback(async () => {
    try {
      // Si está activado el filtro "Sin boleta", buscar pedidos completados sin comprobante
      if (withoutReceiptFilter) {
        const params = new URLSearchParams({
          status: "COMPLETED",
          withoutInvoice: "true",
          showAll: "true",
          page: currentPage.toString(),
          limit: "10"
        })
        
        if (search) params.append("search", search)
        
        const response = await fetch(`/api/orders?${params}`)
        if (!response.ok) throw new Error("Error al cargar pedidos sin boleta")
        
        const data = await response.json()
        // Convertir pedidos a formato similar a facturas para mostrar en la tabla
        const ordersAsInvoices = data.map((order: any) => ({
          id: order.id,
          number: order.orderNumber,
          type: "SIN_BOLETA",
          customerName: order.customerName || "Cliente General",
          customerRuc: order.customerDni || "",
          total: order.totalAmount,
          paymentMethod: "N/A",
          status: "PENDING_RECEIPT",
          issuedAt: order.completedAt || order.updatedAt,
          user: { name: "Sistema" },
          order: {
            orderNumber: order.orderNumber,
            table: order.table
          }
        }))
        setInvoices(ordersAsInvoices)
        setTotalPages(data.pagination?.pages || 1)
      } else {
        // Búsqueda normal de facturas
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "10"
        })
        
        if (search) params.append("search", search)
        if (typeFilter) params.append("type", typeFilter)
        if (paymentFilter) params.append("paymentMethod", paymentFilter)
        if (statusFilter) params.append("status", statusFilter)
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)

        const response = await fetch(`/api/invoices?${params}`)
        if (!response.ok) throw new Error("Error al cargar facturas")

        const data = await response.json()
        setInvoices(data.invoices)
        setTotalPages(data.pagination.pages)
      }
    } catch (err) {
      setError(withoutReceiptFilter ? "Error al cargar pedidos sin boleta" : "Error al cargar las facturas")
      console.error(err)
    }
  }, [currentPage, search, typeFilter, paymentFilter, statusFilter, startDate, endDate, withoutReceiptFilter])

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchInvoices()
      fetchStats()
    }
  }, [session, currentPage, search, typeFilter, paymentFilter, statusFilter, startDate, endDate, withoutReceiptFilter, fetchInvoices])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/invoices/stats?period=today")
      if (!response.ok) throw new Error("Error al cargar estadísticas")

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error loading stats:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchInvoices()
  }

  const clearFilters = () => {
    setSearch("")
    setTypeFilter("")
    setPaymentFilter("")
    setStatusFilter("")
    setStartDate("")
    setEndDate("")
    setWithoutReceiptFilter(false)
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return <Badge variant="default" className="bg-green-500">Emitida</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Anulada</Badge>
      case "PENDING_RECEIPT":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Pendiente Boleta</Badge>
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
      case "SIN_BOLETA":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Sin Boleta</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando comprobantes...</p>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => router.push("/dashboard")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Gestión de Comprobantes</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Estadísticas del día */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Facturas Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.summary.totalInvoices}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ingresos Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.summary.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ticket Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.summary.averageTicket)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Métodos de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {stats.byPaymentMethod.slice(0, 2).map((method) => (
                    <div key={method.method} className="text-xs">
                      <span className="font-medium">{method.method}:</span> {method.count}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Input
                placeholder="Buscar por número, cliente, RUC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:col-span-2"
              />
              
              <select
                value={withoutReceiptFilter ? "SIN_BOLETA" : typeFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "SIN_BOLETA") {
                    setWithoutReceiptFilter(true);
                    setTypeFilter("");
                  } else {
                    setWithoutReceiptFilter(false);
                    setTypeFilter(value);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos los tipos</option>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
                <option value="SIN_BOLETA">Sin boleta</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
                disabled={withoutReceiptFilter}
              >
                <option value="">Todos los pagos</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
                disabled={withoutReceiptFilter}
              >
                <option value="">Todos los estados</option>
                <option value="ISSUED">Emitidas</option>
                <option value="CANCELLED">Anuladas</option>
              </select>

              <div className="flex gap-2">
                <Button onClick={handleSearch} size="sm">
                  Buscar
                </Button>
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de comprobantes */}
        <Card>
          <CardHeader>
            <CardTitle>Comprobantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    {!withoutReceiptFilter && <TableHead>Cliente</TableHead>}
                    <TableHead>Total</TableHead>
                    {!withoutReceiptFilter && <TableHead>Método Pago</TableHead>}
                    {!withoutReceiptFilter && <TableHead>Estado</TableHead>}
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">
                        {invoice.number}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(invoice.type)}
                      </TableCell>
                      {!withoutReceiptFilter && (
                        <TableCell className="max-w-[150px]">
                          <div className="truncate">
                            <div className="font-medium truncate">
                              {invoice.customerName || "Cliente General"}
                            </div>
                            {invoice.customerRuc && (
                              <div className="text-xs text-gray-500 truncate">
                                RUC: {invoice.customerRuc}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      {!withoutReceiptFilter && (
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.paymentMethod}
                          </Badge>
                        </TableCell>
                      )}
                      {!withoutReceiptFilter && (
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {formatDate(invoice.issuedAt)}
                      </TableCell>
                      <TableCell>
                        {withoutReceiptFilter ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Para pedidos sin boleta, cargar datos completos del pedido
                                try {
                                  const response = await fetch(`/api/orders/${invoice.id}`)
                                  if (response.ok) {
                                    const fullOrderData = await response.json()
                                    setSelectedOrder(fullOrderData)
                                    setShowOrderDetailsModal(true)
                                  } else {
                                    console.error('Error al cargar detalles del pedido')
                                    alert('Error al cargar los detalles del pedido')
                                  }
                                } catch (error) {
                                  console.error('Error:', error)
                                  alert('Error al cargar los detalles del pedido')
                                }
                              }}
                            >
                              Ver pedido
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                // Para pedidos sin boleta, cargar datos completos del pedido
                                try {
                                  const response = await fetch(`/api/orders/${invoice.id}`)
                                  if (response.ok) {
                                    const fullOrderData = await response.json()
                                    setSelectedOrder(fullOrderData)
                                    setShowCompleteOrderModal(true)
                                  } else {
                                    console.error('Error al cargar detalles del pedido')
                                    alert('Error al cargar los detalles del pedido')
                                  }
                                } catch (error) {
                                  console.error('Error:', error)
                                  alert('Error al cargar los detalles del pedido')
                                }
                              }}
                            >
                              Emitir
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/facturacion/${invoice.id}`)}
                          >
                            Ver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de crear factura */}
      <CreateInvoiceModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onSuccess={() => {
          fetchInvoices()
          fetchStats()
        }}
      />

      {/* Modal de completar pedido */}
       {selectedOrder && (
         <CompleteOrderModal
           isOpen={showCompleteOrderModal}
           onClose={() => {
             setShowCompleteOrderModal(false)
             setSelectedOrder(null)
           }}
           orderNumber={selectedOrder.orderNumber}
           totalAmount={selectedOrder.totalAmount}
           onComplete={async (receiptType, customerData) => {
             try {
               let receiptNumber = ''
               
               if (receiptType !== 'none') {
                 // Crear comprobante usando el endpoint correcto
                 const invoiceResponse = await fetch('/api/invoices', {
                   method: 'POST',
                   headers: {
                     'Content-Type': 'application/json',
                   },
                   body: JSON.stringify({
                     type: receiptType.toUpperCase(),
                     orderId: selectedOrder.id,
                     customerName: customerData?.name || 'Cliente',
                     customerDocument: customerData?.document || '',
                     customerRuc: receiptType === 'factura' ? customerData?.ruc : customerData?.document,
                     paymentMethod: 'EFECTIVO',
                     amountPaid: selectedOrder.totalAmount
                   })
                 })

                 if (!invoiceResponse.ok) {
                   const error = await invoiceResponse.json()
                   throw new Error(error.error || `Error al generar ${receiptType}`)
                 }

                 const invoice = await invoiceResponse.json()
                 receiptNumber = invoice.number
               }
               
               // Refrescar datos
               fetchInvoices()
               fetchStats()
               setShowCompleteOrderModal(false)
               setSelectedOrder(null)
               
               return receiptNumber
             } catch (error) {
               console.error('Error completing order:', error)
               throw error
             }
           }}
         />
       )}

       {/* Modal de detalles del pedido */}
       {showOrderDetailsModal && selectedOrder && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold">Detalles del Pedido #{selectedOrder.orderNumber}</h2>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   setShowOrderDetailsModal(false)
                   setSelectedOrder(null)
                 }}
                 className="text-gray-500 hover:text-gray-700"
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
             
             <div className="space-y-4">
               {/* Información general */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h3 className="font-medium text-gray-700 mb-2">Información General</h3>
                   <div className="space-y-1 text-sm">
                     <div className="flex items-center gap-2">
                       <span className="font-medium">Estado:</span>
                       <Badge 
                         variant={selectedOrder.status === 'COMPLETED' ? 'default' : 'destructive'}
                         className={`text-xs ${selectedOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                       >
                         {selectedOrder.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                       </Badge>
                     </div>
                     <p><span className="font-medium">Mesa/Tipo:</span> {selectedOrder.table ? `Mesa ${selectedOrder.table.number}` : 'Para llevar'}</p>
                     <p><span className="font-medium">Mesero:</span> {selectedOrder.user?.name || 'No asignado'}</p>
                     <p><span className="font-medium">Fecha:</span> {new Date(selectedOrder.createdAt).toLocaleString('es-PE')}</p>
                   </div>
                 </div>
                 
                 <div>
                   <h3 className="font-medium text-gray-700 mb-2">Resumen</h3>
                   <div className="space-y-1 text-sm">
                     <p><span className="font-medium">Total de items:</span> {selectedOrder.orderItems?.length || 0}</p>
                     <p><span className="font-medium">Total:</span> 
                       <span className="ml-1 font-semibold">
                         S/ {typeof selectedOrder.totalAmount === 'string' ? selectedOrder.totalAmount : selectedOrder.totalAmount?.toFixed(2)}
                       </span>
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Items del pedido */}
               <div>
                 <h3 className="font-medium text-gray-700 mb-3">Items del Pedido</h3>
                 <div className="border border-gray-200 rounded-lg overflow-hidden">
                   <table className="w-full">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Producto</th>
                         <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Cantidad</th>
                         <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Precio Unit.</th>
                         <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Subtotal</th>
                       </tr>
                     </thead>
                     <tbody>
                       {selectedOrder.orderItems?.map((item: any, index: number) => {
                         const unitPrice = typeof item.product.price === "string" ? parseFloat(item.product.price) : item.product.price
                         const subtotal = unitPrice * item.quantity
                         return (
                           <tr key={index} className="border-t border-gray-100">
                             <td className="py-2 px-3 text-sm">{item.product.name}</td>
                             <td className="py-2 px-3 text-sm text-center">{item.quantity}</td>
                             <td className="py-2 px-3 text-sm text-right">S/ {unitPrice.toFixed(2)}</td>
                             <td className="py-2 px-3 text-sm text-right font-medium">S/ {subtotal.toFixed(2)}</td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
               
               {/* Botones de acción */}
               <div className="flex justify-end items-center pt-4">
                 <Button
                   onClick={() => {
                     setShowOrderDetailsModal(false)
                     setSelectedOrder(null)
                   }}
                   className="bg-gray-600 hover:bg-gray-700 text-white"
                 >
                   Cerrar
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
    </RoleGuard>
  )
}
