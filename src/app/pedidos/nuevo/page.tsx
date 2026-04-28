"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ShoppingCart, Utensils, Package, Truck } from "lucide-react"
import TableSelectorWithOccupied from "@/components/TableSelectorWithOccupied"
import ProductGrid from "@/components/ProductGrid"
import OrderCart from "@/components/OrderCart"
import OrderCreatedModal from "@/components/OrderCreatedModal"
import { useThermalPrinter } from "@/components/PrintKitchenButton"
import PrinterErrorModal from "@/components/PrinterErrorModal"
import { RoleGuard } from "@/components/auth/role-guard"

interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string
  isAvailable: boolean
  isActive: boolean
  categoryId: string
  category: {
    id: string
    name: string
  }
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface CustomerData {
  name: string
  phone: string
  address: string
  addressReference: string
}

type OrderType = 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'

interface CreatedOrder {
  id: string
  orderNumber: string
}

export default function NewOrderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Estados principales
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [printerError, setPrinterError] = useState<string | null>(null)
  
  // Estados para tipo de pedido y datos del cliente
  const [orderType, setOrderType] = useState<OrderType>('MESA')
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    address: "",
    addressReference: ""
  })

  // Hook para impresion termica
  const { printOrder } = useThermalPrinter()

  // Cargar datos iniciales
  useEffect(() => {
    Promise.all([
      fetchTables(),
      fetchCategories(),
      fetchProducts()
    ]).finally(() => setIsLoading(false))
  }, [])

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        // Incluir mesas disponibles, esperando y ocupadas para permitir pedidos adicionales
        setTables(data.filter((table: Table) => 
          table.status === "DISPONIBLE" || table.status === "ESPERANDO" || table.status === "OCUPADA"
        ))
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
        if (data.length > 0) {
          setSelectedCategory(data[0].id)
        }
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.filter((product: Product) => product.isActive && product.isAvailable))
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    }
  }

  const addToCart = (product: Product, quantity: number = 1, productNotes?: string) => {
    const existingItem = cartItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity, notes: productNotes || item.notes }
          : item
      ))
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
        notes: productNotes
      }])
    }
  }

  const updateCartItem = (productId: string, quantity: number, productNotes?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCartItems(cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity, notes: productNotes !== undefined ? productNotes : item.notes }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId))
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  // Validación antes de crear el pedido
  const isValidOrder = () => {
    // Validación del nombre del cliente según el tipo de pedido
    if ((orderType === 'PARA_LLEVAR' || orderType === 'DELIVERY') && !customerData.name.trim()) {
      alert("Para pedidos para llevar y delivery, el nombre del cliente es obligatorio")
      return false
    }
    
    // Validación específica por tipo de pedido
    if (orderType === 'MESA' && !selectedTable) {
      alert("Por favor, seleccione una mesa")
      return false
    }
    
    if (orderType === 'DELIVERY') {
      if (!customerData.phone.trim()) {
        alert("Para pedidos de delivery, el teléfono es obligatorio")
        return false
      }
      if (!customerData.address.trim()) {
        alert("Para pedidos de delivery, la dirección es obligatoria")
        return false
      }
    }
    
    if (cartItems.length === 0) {
      alert("Por favor, agregue al menos un producto al pedido")
      return false
    }
    
    return true
  }

  const createOrder = async () => {
    if (!isValidOrder()) {
      return
    }
    setIsCreatingOrder(true)
    setPrinterError(null)
    try {
      const orderData = {
        tableId: orderType === 'MESA' ? selectedTable?.id : undefined,
        type: orderType,
        customerName: customerData.name.trim() || "CLIENTE",
        customerDni: undefined, // DNI se solicitará al completar el pedido
        customerPhone: customerData.phone.trim() || undefined,
        customerAddress: customerData.address.trim() || undefined,
        customerAddressReference: customerData.addressReference.trim() || undefined,
        notes: notes || null,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || null
        }))
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const order = await response.json()
        
        // 🚀 IMPRESION AUTOMATICA A COCINA
        if (orderType === 'MESA' || orderType === 'PARA_LLEVAR' || orderType === 'DELIVERY') {
          try {
            await printOrder(order.id, {
              tableNumber: orderType === 'MESA' ? selectedTable?.number?.toString() : orderType,
              waiterName: session?.user?.name || 'Sistema',
              isUrgent: false
            })
          } catch (printError: unknown) {
            setPrinterError(printError instanceof Error ? printError.message : 'No se pudo imprimir en la impresora de cocina.');
            // No interrumpimos el flujo si falla la impresión
          }
        }
        
        setCreatedOrder(order)
        setShowOrderModal(true)
      } else {
        const error = await response.json()
        alert(`Error al crear pedido: ${error.error}`)
      }
    } catch (error) {
      console.error("Error al crear pedido:", error)
      alert("Error al crear el pedido")
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const filteredProducts = products.filter(product => 
    selectedCategory ? product.categoryId === selectedCategory : true
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando nuevo pedido...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["MESERO", "JEFE"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-10">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => router.push("/pedidos")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Pedidos</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Nuevo Pedido</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push("/pedidos")}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </Button>
              <Button 
                onClick={createOrder}
                disabled={
                  !customerData.name.trim() || 
                  (orderType === 'MESA' && !selectedTable) || 
                  (orderType === 'DELIVERY' && (!customerData.phone.trim() || !customerData.address.trim())) || 
                  cartItems.length === 0 || 
                  isCreatingOrder
                }
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ShoppingCart className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{isCreatingOrder ? "Creando..." : `Crear Pedido (S/ ${typeof calculateTotal() === 'number' ? calculateTotal().toFixed(2) : '0.00'})`}</span>
                <span className="sm:hidden">{isCreatingOrder ? "..." : "Crear"}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel Principal - Datos del Cliente, Mesa y Productos */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tipo de Pedido y Datos del Cliente */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Tipo de Pedido y Datos del Cliente
                </h2>
                <p className="text-sm text-gray-600">Selecciona el tipo de pedido e ingresa los datos del cliente</p>
              </div>
              <div className="space-y-6">
                {/* Selector de Tipo de Pedido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pedido *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={orderType === 'MESA' ? 'default' : 'outline'}
                      onClick={() => {
                        setOrderType('MESA')
                        setSelectedTable(null)
                      }}
                      className="h-12 flex flex-col items-center justify-center gap-1"
                    >
                      <Utensils className="w-4 h-4" />
                      <span className="text-xs">Mesa</span>
                    </Button>
                    <Button
                      type="button"
                      variant={orderType === 'PARA_LLEVAR' ? 'default' : 'outline'}
                      onClick={() => {
                        setOrderType('PARA_LLEVAR')
                        setSelectedTable(null)
                      }}
                      className="h-12 flex flex-col items-center justify-center gap-1"
                    >
                      <Package className="w-4 h-4" />
                      <span className="text-xs">Para Llevar</span>
                    </Button>
                    <Button
                      type="button"
                      variant={orderType === 'DELIVERY' ? 'default' : 'outline'}
                      onClick={() => {
                        setOrderType('DELIVERY')
                        setSelectedTable(null)
                      }}
                      className="h-12 flex flex-col items-center justify-center gap-1"
                    >
                      <Truck className="w-4 h-4" />
                      <span className="text-xs">Delivery</span>
                    </Button>
                  </div>
                </div>

                {/* Datos del Cliente */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo {orderType === 'MESA' ? '(Opcional)' : '*'}
                      </label>
                      <Input
                        placeholder="Ej: Juan Pérez García"
                        value={customerData.name}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full"
                        required={orderType !== 'MESA'}
                      />
                    </div>
                    {orderType === 'DELIVERY' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono *
                        </label>
                        <Input
                          placeholder="Ej: 987654321"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Campos adicionales para Delivery */}
                  {orderType === 'DELIVERY' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección Completa *
                        </label>
                        <Input
                          placeholder="Ej: Av. Los Pinos 123, Urb. San José, Distrito de Lima"
                          value={customerData.address}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referencias Adicionales (Opcional)
                        </label>
                        <Input
                          placeholder="Ej: Casa azul, portón negro, al lado de la farmacia"
                          value={customerData.addressReference}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, addressReference: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Mensajes de validación */}
                {(orderType === 'PARA_LLEVAR' || orderType === 'DELIVERY') && !customerData.name.trim() && (
                  <p className="text-sm text-red-600">
                    * Para pedidos {orderType === 'PARA_LLEVAR' ? 'para llevar' : 'de delivery'}, el nombre del cliente es obligatorio
                  </p>
                )}
                {orderType === 'DELIVERY' && !customerData.phone.trim() && (
                  <p className="text-sm text-red-600">
                    * Para pedidos de delivery, el teléfono es obligatorio
                  </p>
                )}
                {orderType === 'DELIVERY' && !customerData.address.trim() && (
                  <p className="text-sm text-red-600">
                    * Para pedidos de delivery, la dirección es obligatoria
                  </p>
                )}
                
                {/* Información del tipo de pedido */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    {orderType === 'MESA' && (
                      <>
                        <Utensils className="w-4 h-4" />
                        <span>Pedido para consumir en mesa del restaurante</span>
                      </>
                    )}
                    {orderType === 'PARA_LLEVAR' && (
                      <>
                        <Package className="w-4 h-4" />
                        <span>Pedido para llevar - no requiere mesa</span>
                      </>
                    )}
                    {orderType === 'DELIVERY' && (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Pedido con entrega a domicilio - requiere teléfono y dirección completa</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Selección de Mesa - Solo para pedidos tipo MESA */}
            {orderType === 'MESA' && (
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Seleccionar Mesa
                  </h2>
                  <p className="text-sm text-gray-600">Elige una mesa disponible para el pedido</p>
                </div>
                <div>
                  <TableSelectorWithOccupied
                    tables={tables}
                    selectedTable={selectedTable}
                    onSelectTable={setSelectedTable}
                    showOccupied={false}
                  />
                  {!selectedTable && (
                    <p className="text-sm text-red-600 mt-2">
                      * Debe seleccionar una mesa para pedidos en el restaurante
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Selección de Productos */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
              <h2 className="text-base font-medium text-gray-900 mb-3">
                Seleccionar Productos
              </h2>
              
              {/* Tabs de Categorías */}
              <div className="flex flex-wrap gap-1 mb-3">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Grid de Productos */}
              <ProductGrid
                products={filteredProducts}
                onAddToCart={addToCart}
                cartItems={cartItems}
              />
            </div>

            {/* Notas Generales */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Notas del Pedido (Opcional)
                </h2>
                <p className="text-sm text-gray-600">Agrega observaciones especiales para el pedido</p>
              </div>
              <div>
                <Input
                  placeholder="Ej: Cliente prefiere sin cebolla, mesa al lado de la ventana..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Panel Lateral - Carrito */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <OrderCart
                items={cartItems}
                selectedTable={selectedTable}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                total={calculateTotal()}
                onCreateOrder={createOrder}
                isCreating={isCreatingOrder}
                orderType={orderType}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Pedido Creado */}
       {showOrderModal && createdOrder && (
         <OrderCreatedModal
           isOpen={showOrderModal}
           onClose={() => setShowOrderModal(false)}
           orderNumber={createdOrder.orderNumber}
           orderId={createdOrder.id}
           orderType={orderType}
           tableNumber={selectedTable?.number}
           totalAmount={calculateTotal()}
         />
       )}
       {/* Modal de error de impresora */}
      <PrinterErrorModal
        open={!!printerError}
        errorMessage={printerError || ''}
        onClose={() => setPrinterError(null)}
      />
    </div>
    </RoleGuard>
  )
}
