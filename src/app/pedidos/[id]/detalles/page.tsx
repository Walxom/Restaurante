"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import OrderItemsList from "@/components/OrderItemsList"
import CompleteOrderModal from "@/components/CompleteOrderModal"
import ThermalPrintButton from "@/components/ThermalPrintButton"
import ConfirmDialog from "@/components/ConfirmDialog"
import { 
  ArrowLeft, 
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

// Hooks Personalizados
import { useOrderDetail } from "@/hooks/use-order-detail"
import { useOrderPayment } from "@/hooks/use-order-payment"
import { useOrderPrinting } from "@/hooks/use-order-printing"

import { RoleGuard } from "@/components/auth/role-guard"
import { AppLoading } from "@/components/dashboard/AppLoading"
import { getOrderTypeLabel } from "@/lib/order-utils"

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
      <div className="flex flex-col justify-center items-center min-h-screen bg-background">
        <div className="text-center space-y-6">
           <Search className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
           <h2 className="text-2xl font-black text-rose-600 uppercase tracking-tighter">Pedido no encontrado</h2>
          <Button onClick={() => router.push("/pedidos")} className="bg-blue-600 hover:bg-blue-700 h-12 rounded-2xl px-8 font-black uppercase tracking-widest">
            Volver a Pedidos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/40 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                onClick={() => router.push("/pedidos")} 
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-12 w-12 rounded-2xl bg-foreground/5"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black text-foreground tracking-tighter">
                    Pedido #{order.orderNumber}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">
                      {getOrderTypeLabel(order.type, order.table?.number)}
                    </span>
                  </div>
                </div>
                {['PENDING', 'CONFIRMED', 'SERVED'].includes(order.status) && (
                  <Button
                    onClick={() => router.push(`/pedidos/${order.id}/edit`)}
                    variant="outline"
                    className="h-10 rounded-xl bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase tracking-widest text-[9px] hover:bg-blue-500 hover:text-white transition-all ml-4"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Modificar Pedido
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información del Pedido */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-border/50 shadow-xl">
              <h2 className="text-lg font-black text-foreground uppercase tracking-widest mb-6 flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500" />
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
                    <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
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
    </RoleGuard>
  )
}