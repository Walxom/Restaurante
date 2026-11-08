"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import OrderItemsList from "@/features/orders/components/OrderItemsList"
import CompleteOrderModal from "@/features/orders/components/CompleteOrderModal"
import ThermalPrintButton from "@/features/billing/components/ThermalPrintButton"
import ConfirmDialog from "@/components/ConfirmDialog"
import {
  Clock,
  User,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  Plus,
  Search,
  Printer
} from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"

// Hooks Personalizados
import { useOrderDetail } from "@/features/orders/hooks/useOrderDetail"
import { useOrderPayment } from "@/features/orders/hooks/useOrderPayment"
import { useOrderPrinting } from "@/features/orders/hooks/useOrderPrinting"

import { RoleGuard } from "@/components/auth/role-guard"
import { AppLoading } from "@/components/ui/AppLoading"
import { getOrderTypeLabel } from "@/features/orders/utils/order-utils"

export default function OrderDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  // Hooks de Lógica Extraída
  const { 
    order, 
    isLoading, 
    error, 
    refreshOrder, 
    updateStatus, 
    markAllItemsAsServed,
    isMarkingAllServed,
    getStatusColor,
    getStatusText,
    getNextStatusActions,
    canCancelOrder,
  } = useOrderDetail(orderId)

  const {
    completeModalOpen,
    setCompleteModalOpen,
    processCompleteOrder
  } = useOrderPayment(order, refreshOrder)

  const {
    isPrintingKitchen,
    isPrintingPreReceipt,
    printToKitchen,
    printPreReceipt
  } = useOrderPrinting(order)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showKitchenPrintConfirm, setShowKitchenPrintConfirm] = useState(false)

  const handleCompleteOrder = () => {
    if (order) setCompleteModalOpen(true)
  }

  const handleCancelOrder = () => {
    setShowCancelConfirm(true)
  }

  const confirmCancelOrder = async () => {
    const success = await updateStatus('CANCELLED')
    if (success) {
      setShowCancelConfirm(false)
      router.push("/pedidos")
    }
  }

  const handleConfirmPrintToKitchen = async () => {
    setShowKitchenPrintConfirm(false)
    await printToKitchen('Sistema')
  }

  const handlePrintPreReceipt = async () => {
    await printPreReceipt()
  }

  if (isLoading) return <AppLoading />

  if (error === "NOT_FOUND" || !order) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background animate-in fade-in duration-500">
        <div className="text-center space-y-6">
          <Search className="w-16 h-16 text-muted-foreground mx-auto opacity-20 animate-pulse" />
          <h2 className="text-xl font-black text-rose-600 uppercase tracking-widest">Pedido no encontrado</h2>
          <Button onClick={() => router.push("/pedidos")} className="bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-xl px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
            Volver a Pedidos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title={`Pedido #${order.orderNumber}`}
            subtitle={
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                  {getOrderTypeLabel(order.type, order.table?.number)}
                </span>
              </div>
            }
            icon={FileText}
            maxWidth="max-w-[1600px]"
            backTo="/pedidos"
          >
            {['PENDING', 'CONFIRMED', 'SERVED'].includes(order.status) && (
              <Button
                onClick={() => router.push(`/pedidos/${order.id}/edit`)}
                size="sm"
                className="h-9 px-3 sm:px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              >
                <Plus className="w-3.5 h-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Modificar Pedido</span>
                <span className="sm:hidden">Modificar</span>
              </Button>
            )}
          </AdminPageHeader>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información del Pedido */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-6 flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                Detalles
              </h2>
              
              <div className="space-y-6">
                <div className="grid gap-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Registro</label>
                  <p className="text-sm font-bold text-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="grid gap-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Atendido por</label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <p className="font-bold text-foreground">{order.user.name}</p>
                  </div>
                </div>

                {order.type === 'MESA' && order.table && (
                  <div className="grid gap-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ubicación</label>
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      {getOrderTypeLabel(order.type, order.table?.number)}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones de Estado */}
              <div className="mt-10 pt-8 border-t border-border/50 space-y-3">
                {/* Reenviar a Cocina */}
                {['PENDING', 'CONFIRMED'].includes(order.status) && (
                  <Button
                    onClick={() => setShowKitchenPrintConfirm(true)}
                    disabled={isPrintingKitchen}
                    className="w-full h-12 rounded-2xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    {isPrintingKitchen ? "Enviando..." : "Reenviar a Cocina"}
                  </Button>
                )}

                {/* Pre-Boleta */}
                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <Button
                    onClick={handlePrintPreReceipt}
                    disabled={isPrintingPreReceipt}
                    className="w-full h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 font-black uppercase tracking-widest text-[10px]"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isPrintingPreReceipt ? "Imprimiendo..." : "Pre-Boleta"}
                  </Button>
                )}

                {/* Botones de Flujo de Trabajo */}
                {getNextStatusActions(order.status).map((action) => (
                  <Button
                    key={action.status}
                    onClick={() => {
                      if (action.action === 'markAllServed') markAllItemsAsServed()
                      else if (action.action === 'complete') handleCompleteOrder()
                      else if (action.action === 'cancel') handleCancelOrder()
                      else updateStatus(action.status)
                    }}
                    disabled={action.action === 'markAllServed' && isMarkingAllServed}
                    className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${action.color} text-white`}
                  >
                    {action.label}
                  </Button>
                ))}

                {/* Botón de Impresión de Comprobante Final */}
                {order.status === 'COMPLETED' && (
                  <ThermalPrintButton 
                    order={order}
                    currentUser={{
                      id: session?.user?.id || '',
                      name: session?.user?.name || '',
                      role: session?.user?.role || ''
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Items del Pedido */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-border/50 shadow-xl min-h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Productos</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Control de comandas</p>
                </div>
                <div className="text-right">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Inversión Total</label>
                  <span className="text-3xl font-black text-emerald-500 tracking-tighter">S/ {Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
              
              <OrderItemsList
                orderId={order.id}
                items={order.orderItems}
                onItemStatusChange={refreshOrder}
                canMarkAsServed={!['COMPLETED', 'CANCELLED'].includes(order.status)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modales */}
      <CompleteOrderModal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        onComplete={processCompleteOrder}
        orderNumber={order?.orderNumber || ''}
        totalAmount={Number(order?.totalAmount || 0)}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={confirmCancelOrder}
        title="Anular Pedido"
        description="Esta acción marcará el pedido como cancelado y liberará los recursos. ¿Continuar?"
        confirmText="Confirmar Anulación"
        cancelText="Volver"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={showKitchenPrintConfirm}
        onClose={() => setShowKitchenPrintConfirm(false)}
        onConfirm={handleConfirmPrintToKitchen}
        title="Reenviar Comanda"
        description={`Se enviará nuevamente la orden #${order?.orderNumber} a la cocina.`}
        confirmText="Imprimir"
        cancelText="Cancelar"
      />
        </div>
      </div>
    </RoleGuard>
  )
}