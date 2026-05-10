"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, ArrowLeft } from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"

import CreateInvoiceModal from "@/components/CreateInvoiceModal"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import OrderDetailsModal from "@/components/OrderDetailsModal"
import InvoicesStats from "@/components/dashboard/InvoicesStats"
import InvoicesFilters from "@/components/dashboard/InvoicesFilters"
import InvoicesTable from "@/components/dashboard/InvoicesTable"
import { AlertCircle, ArrowRight, ShieldAlert } from "lucide-react"

import { useInvoices } from "@/hooks/useInvoices"

export default function FacturacionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const {
    invoices,
    stats,
    loading,
    error,
    filters,
    pagination,
    fetchInvoices,
    fetchStats,
    handleSearch,
    clearFilters
  } = useInvoices()

  const { pendingCount } = filters

  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)

  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    paymentFilter, setPaymentFilter,
    statusFilter, setStatusFilter,
    startDate, setStartDate,
    endDate, setEndDate,
    withoutReceiptFilter, setWithoutReceiptFilter
  } = filters

  const {
    currentPage, setCurrentPage,
    totalPages
  } = pagination

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Emitida</span>
      case "CANCELLED":
        return <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Anulada</span>
      case "PENDING_RECEIPT":
        return <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Pendiente</span>
      default:
        return <span className="px-2.5 py-0.5 bg-foreground/10 border border-border/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase tracking-widest">{status}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "BOLETA":
        return <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Boleta</span>
      case "FACTURA":
        return <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Factura</span>
      case "SIN_BOLETA":
        return <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Sin Boleta</span>
      default:
        return <span className="px-2.5 py-0.5 bg-foreground/10 border border-border/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase tracking-widest">{type}</span>
    }
  }

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN"
    }).format(value || 0)
  }

  const onCompleteOrder = async (receiptType: string, customerData: any) => {
    try {
      let receiptNumber = ''
      
      if (receiptType !== 'none') {
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
          const errorData = await invoiceResponse.json()
          throw new Error(errorData.error || `Error al generar ${receiptType}`)
        }

        const invoice = await invoiceResponse.json()
        receiptNumber = invoice.number
      }
      
      fetchInvoices()
      fetchStats()
      setShowCompleteOrderModal(false)
      setSelectedOrder(null)
      
      return receiptNumber
    } catch (error) {
      console.error('Error completing order:', error)
      throw error
    }
  }

  const onViewOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (response.ok) {
        const fullOrderData = await response.json()
        setSelectedOrder(fullOrderData)
        setShowOrderDetailsModal(true)
      }
    } catch (error) { console.error(error) }
  }

  const onEmitOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (response.ok) {
        const fullOrderData = await response.json()
        setSelectedOrder(fullOrderData)
        setShowCompleteOrderModal(true)
      }
    } catch (error) { console.error(error) }
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
        <div className="relative z-10 flex flex-col">
      {/* Header minimalista */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6">
              <Button 
                onClick={() => router.push("/dashboard")} 
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-bold uppercase tracking-widest text-[10px]">Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-border/50 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                Gestión de Comprobantes
              </h1>
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

        {/* Alerta de Pedidos sin Boleta */}
        {pendingCount > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-orange-500/20 p-2 rounded-xl animate-pulse">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest">Atención: Facturación Pendiente</h4>
                <p className="text-xs text-orange-500/70 font-medium">Tienes <span className="font-black underline">{pendingCount}</span> pedidos terminados que aún no tienen un comprobante de pago.</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                filters.setWithoutReceiptFilter(true)
                handleSearch()
              }}
              className="border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all"
            >
              Gestionar Ahora
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        <InvoicesStats stats={stats} formatCurrency={formatCurrency} />

        <InvoicesFilters 
          filters={filters} 
          handleSearch={handleSearch} 
          clearFilters={clearFilters} 
        />

        <InvoicesTable 
          invoices={invoices}
          withoutReceiptFilter={withoutReceiptFilter}
          pagination={pagination}
          formatCurrency={formatCurrency}
          formatDate={(date) => new Date(date).toLocaleDateString("es-PE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })}
          getStatusBadge={getStatusBadge}
          getTypeBadge={getTypeBadge}
          onViewOrder={onViewOrder}
          onEmitOrder={onEmitOrder}
          router={router}
        />
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
           onComplete={onCompleteOrder}
         />
       )}

       {/* Modal de detalles del pedido */}
       <OrderDetailsModal
         isOpen={showOrderDetailsModal}
         onClose={() => {
           setShowOrderDetailsModal(false)
           setSelectedOrder(null)
         }}
         order={selectedOrder}
       />
    </div>
    </div>
    </RoleGuard>
  )
}
