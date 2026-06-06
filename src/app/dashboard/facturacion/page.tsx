"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { RoleGuard } from "@/components/auth/role-guard"

import CreateInvoiceModal from "@/features/billing/components/CreateInvoiceModal"
import CompleteOrderModal from "@/features/orders/components/CompleteOrderModal"
import OrderDetailsModal from "@/features/orders/components/OrderDetailsModal"
import InvoicesStats from "@/features/dashboard/components/InvoicesStats"
import InvoicesFilters from "@/features/dashboard/components/InvoicesFilters"
import InvoicesTable from "@/features/dashboard/components/InvoicesTable"
import { PendingAlert } from "@/components/ui/StatusAlert"

import { useInvoices } from "@/features/billing/hooks/useInvoices"

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

  const onCompleteOrder = async (receiptType: string, customerData: any, paymentMethod: string = 'EFECTIVO') => {
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
            customerRuc: receiptType === 'factura' ? customerData?.ruc : undefined,
            paymentMethod,
            amountPaid: Number(selectedOrder.totalAmount)
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
      <div className="min-h-screen bg-background transition-colors duration-500 overflow-x-hidden w-full">
        <div className="relative z-10 flex flex-col w-full min-w-0">
          <AdminPageHeader
            title="Gestión de Comprobantes"
            icon={FileText}
            iconBg="bg-blue-500/10"
            iconClass="text-blue-500"
            backTo="/dashboard"
          />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-hidden">
        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        <PendingAlert
          count={pendingCount}
          entity="pedidos terminados sin comprobante"
          actionLabel="Gestionar Ahora"
          onAction={() => { filters.setWithoutReceiptFilter(true); handleSearch() }}
        />

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
