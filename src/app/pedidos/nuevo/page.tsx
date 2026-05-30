"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ShoppingCart, Utensils, User, MapPin, FileText } from "lucide-react"

// Componentes
import TableSelectorWithOccupied from "@/features/tables/components/TableSelectorWithOccupied"
import ProductGrid from "@/features/menu/components/ProductGrid"
import OrderCart from "@/features/orders/components/OrderCart"
import OrderCreatedModal from "@/features/orders/components/OrderCreatedModal"
import PrinterErrorModal from "@/features/billing/components/PrinterErrorModal"
import { RoleGuard } from "@/components/auth/role-guard"
import { OrderTypeSelector } from "@/components/orders/OrderTypeSelector"
import { CustomerForm } from "@/components/orders/CustomerForm"
import { CategoryTabs } from "@/components/orders/CategoryTabs"

// Hooks y Tipos
import { useCart } from "@/features/orders/hooks/useCart"
import { useOrderData } from "@/features/orders/hooks/useOrderData"
import { useCreateOrder } from "@/features/orders/hooks/useCreateOrder"
import { CustomerData, OrderType, Table } from "@/types"

import { OrderPageSkeleton } from "@/components/orders/OrderPageSkeleton"
import { StateFeedback } from "@/components/ui/StateFeedback"

// Forzar renderizado dinámico (esta página requiere autenticación y localStorage)
export const dynamic = "force-dynamic"

export default function NewOrderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Hooks de lógica
  const { cartItems, addToCart, updateCartItem, removeFromCart, clearCart, calculateTotal } = useCart()
  const { tables, categories, products, isLoading, error, refreshData } = useOrderData()
  const { 
    isCreatingOrder, showOrderModal, setShowOrderModal, 
    createdOrder, printerError, setPrinterError, isPrintSkipped, createOrder 
  } = useCreateOrder()

  // Estados locales del formulario
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [orderType, setOrderType] = useState<OrderType>('MESA')
  const [notes, setNotes] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "", phone: "", address: "", addressReference: ""
  })
  const [isFormHydrated, setIsFormHydrated] = useState(false)

  // Cargar estado del formulario desde localStorage
  useEffect(() => {
    const savedType = localStorage.getItem("order_type")
    const savedTable = localStorage.getItem("selected_table")
    const savedCustomer = localStorage.getItem("customer_data")
    const savedNotes = localStorage.getItem("order_notes")

    if (savedType) setOrderType(savedType as OrderType)
    if (savedTable) {
      try { setSelectedTable(JSON.parse(savedTable)) } catch (e) {}
    }
    if (savedCustomer) {
      try { setCustomerData(JSON.parse(savedCustomer)) } catch (e) {}
    }
    if (savedNotes) setNotes(savedNotes)
    
    setIsFormHydrated(true)
  }, [])

  // Persistir estado del formulario
  useEffect(() => {
    if (isFormHydrated) {
      localStorage.setItem("order_type", orderType)
      localStorage.setItem("selected_table", JSON.stringify(selectedTable))
      localStorage.setItem("customer_data", JSON.stringify(customerData))
      localStorage.setItem("order_notes", notes)
    }
  }, [orderType, selectedTable, customerData, notes, isFormHydrated])

  const clearForm = () => {
    setSelectedTable(null)
    setNotes("")
    setCustomerData({ name: "", phone: "", address: "", addressReference: "" })
    localStorage.removeItem("order_type")
    localStorage.removeItem("selected_table")
    localStorage.removeItem("customer_data")
    localStorage.removeItem("order_notes")
  }

  const handleCreateOrder = async () => {
    const result = await createOrder({
      cartItems, orderType, customerData, 
      selectedTable, notes, session
    })

    if (result) {
      clearCart()
      clearForm()
    }
  }

  const filteredProducts = products.filter(product => 
    selectedCategory ? product.categoryId === selectedCategory : true
  )

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <StateFeedback
          title="Error de Conexión"
          description={error}
          variant="error"
          actionLabel="Reintentar Carga"
          onAction={refreshData}
          isLoading={isLoading}
        />
      </div>
    )
  }

  if (isLoading || !isFormHydrated) {
    return <OrderPageSkeleton />
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="fixed inset-0 bg-linear-to-br from-blue-500/[0.02] via-transparent to-indigo-500/[0.02] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button onClick={() => router.push("/pedidos")} variant="ghost" size="sm" className="rounded-xl hover:bg-accent group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline font-medium">Volver a Pedidos</span>
                  </Button>
                  <div className="h-6 w-px bg-border/50 hidden sm:block"></div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Nuevo Pedido</h1>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => router.push("/pedidos")} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:flex font-medium">
                    Descartar
                  </Button>
                  <Button 
                    onClick={handleCreateOrder}
                    disabled={isCreatingOrder || cartItems.length === 0}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all font-medium h-10 px-4"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    <span>{isCreatingOrder ? "Creando..." : `Confirmar (S/ ${calculateTotal().toFixed(2)})`}</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-8">
                {/* Configuración del Pedido */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-1 tracking-tight flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500" />
                      Configuración del Pedido
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Tipo de atención y datos del cliente</p>
                  </div>
                  <div className="space-y-8">
                    <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} setSelectedTable={setSelectedTable} />
                    <CustomerForm orderType={orderType} customerData={customerData} setCustomerData={setCustomerData} />
                  </div>
                </div>

                {/* Selección de Mesa */}
                {orderType === 'MESA' && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-foreground mb-1 tracking-tight flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        Selección de Mesa
                      </h2>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <TableSelectorWithOccupied tables={tables} selectedTable={selectedTable} onSelectTable={setSelectedTable} showOccupied={false} />
                    </div>
                  </div>
                )}

                {/* Menú del Día */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground mb-1 tracking-tight flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-emerald-500" />
                        Menú del Día
                      </h2>
                    </div>
                    <CategoryTabs categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                  </div>
                  <div className="p-2">
                    <ProductGrid products={filteredProducts} onAddToCart={addToCart} cartItems={cartItems} />
                  </div>
                </div>

                {/* Observaciones */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-foreground mb-1 tracking-tight flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      Observaciones
                    </h2>
                  </div>
                  <Input
                    placeholder="Ej: Sin cebolla, extra salsa..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Panel Lateral - Carrito */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <OrderCart
                    items={cartItems}
                    selectedTable={selectedTable}
                    onUpdateItem={updateCartItem}
                    onRemoveItem={removeFromCart}
                    total={calculateTotal()}
                    onCreateOrder={handleCreateOrder}
                    isCreating={isCreatingOrder}
                    orderType={orderType}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Modales */}
        {showOrderModal && createdOrder && (
          <OrderCreatedModal
            isOpen={showOrderModal}
            onClose={() => setShowOrderModal(false)}
            orderNumber={createdOrder.orderNumber}
            orderId={createdOrder.id}
            orderType={orderType}
            tableNumber={createdOrder.table?.number}
            totalAmount={Number(createdOrder.totalAmount)}
            isPrintSkipped={isPrintSkipped}
          />
        )}
        <PrinterErrorModal open={!!printerError} errorMessage={printerError || ''} onClose={() => setPrinterError(null)} />
      </div>
    </RoleGuard>
  )
}
