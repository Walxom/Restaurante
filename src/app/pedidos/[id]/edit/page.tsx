"use client"

import { useParams, useRouter } from "next/navigation"
import { useEditOrder } from "@/features/orders/hooks/useEditOrder"
import { EditOrderHeader } from "@/features/orders/components/EditOrderHeader"
import { EditOrderCatalog } from "@/features/orders/components/EditOrderCatalog"
import { EditOrderCart } from "@/features/orders/components/EditOrderCart"
import ConfirmDialog from "@/components/ConfirmDialog"
import { AppLoading } from "@/features/dashboard/components/AppLoading"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const {
    order,
    products,
    isLoading,
    orderNotFound,
    isSaving,
    orderNotes,
    setOrderNotes,
    selectedCategory,
    setSelectedCategory,
    servedItems,
    orderItems,
    dialog,
    closeDialog,
    addProduct,
    updateItemQuantity,
    updateItemNotes,
    removeItem,
    calculateTotal,
    calculateServedTotal,
    calculateGrandTotal,
    saveOrder,
    cancelOrder
  } = useEditOrder(orderId)

  if (isLoading) {
    return <AppLoading />
  }

  if (orderNotFound || !order) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background relative overflow-hidden">
        <div className="text-center space-y-6 z-10 p-8 bg-card/30 backdrop-blur-md rounded-3xl border border-border/50 shadow-xl max-w-sm">
          <Search className="w-16 h-16 text-muted-foreground mx-auto opacity-20 animate-pulse" />
          <h2 className="text-lg font-black text-rose-600 uppercase tracking-widest">Pedido no encontrado</h2>
          <p className="text-xs text-muted-foreground">El pedido que buscas no existe o ha sido eliminado.</p>
          <Button onClick={() => router.push("/pedidos")} className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
            Volver a Pedidos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-500 pb-12">

        <div className="relative z-10 flex flex-col min-h-screen">
          <EditOrderHeader
            order={order}
            onBack={() => router.push(`/pedidos/${orderId}/detalles`)}
          />

          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom duration-500">
              
              {/* Left Column: Product Catalog */}
              <div className="lg:col-span-2 space-y-6">
                <EditOrderCatalog
                  products={products}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  onAddProduct={addProduct}
                />
              </div>

              {/* Right Column: Editable Cart */}
              <div className="lg:col-span-1">
                <EditOrderCart
                  servedItems={servedItems}
                  orderItems={orderItems}
                  orderNotes={orderNotes}
                  setOrderNotes={setOrderNotes}
                  onUpdateQuantity={updateItemQuantity}
                  onUpdateNotes={updateItemNotes}
                  onRemoveItem={removeItem}
                  onSave={saveOrder}
                  onCancel={cancelOrder}
                  isSaving={isSaving}
                  orderStatus={order.status}
                  servedTotal={calculateServedTotal()}
                  pendingTotal={calculateTotal()}
                  grandTotal={calculateGrandTotal()}
                />
              </div>

            </div>
          </main>
        </div>

        {/* Centralized Confirmation Dialog */}
        {dialog && (
          <ConfirmDialog
            isOpen={dialog.isOpen}
            onClose={closeDialog}
            onConfirm={dialog.onConfirm}
            title={dialog.title}
            description={dialog.description}
            variant={dialog.variant}
            confirmText={dialog.confirmText}
            cancelText={dialog.cancelText}
            isLoading={isSaving}
          />
        )}
      </div>
    </RoleGuard>
  )
}
