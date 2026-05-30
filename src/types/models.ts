
export interface IngredientCategory {
  id: string
  name: string
  description?: string | null
  color?: string | null
  isActive?: boolean
  _count?: {
    ingredients: number
  }
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  unitCategory?: string
  currentStock: number
  minStock: number
  maxStock?: number
  cost?: number
  categoryId?: string
  category?: IngredientCategory
  isActive: boolean
  // Campos calculados para la UI
  status: string
  statusColor: string
  statusText: string
  stockPercentage: number
  createdAt?: string
  updatedAt?: string
}

export interface Category {
  id: string
  name: string
  description?: string | null
  isActive?: boolean
  productCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number | string
  isAvailable: boolean
  isActive: boolean
  categoryId?: string
  category?: {
    id: string
    name: string
  }
  recipe?: Recipe | null
  createdAt?: string
  updatedAt?: string
}

export interface Recipe {
  id: string
  productId: string
  instructions?: string | null
  prepTime?: number | null
  servings: number
  isActive: boolean
  ingredients: RecipeIngredient[]
  createdAt?: string
  updatedAt?: string
}

export interface RecipeIngredient {
  id: string
  recipeId: string
  ingredientId: string
  quantity: number
  unit: string
  notes?: string | null
  ingredient?: Ingredient
  createdAt?: string
  updatedAt?: string
}

export interface PaginationData {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface AlertStats {
  total: number
  empty: number
  critical: number
  low: number
}

// --- TIPOS DE PEDIDOS Y MESAS ---

export type TableStatus = 'DISPONIBLE' | 'OCUPADA' | 'ESPERANDO' | 'MANTENIMIENTO'

export interface Table {
  id: string
  number: number
  capacity: number
  status: TableStatus
  isActive?: boolean
}

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export interface CustomerData {
  name: string
  phone: string
  address: string
  addressReference: string
}

export type OrderType = 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'

export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'

export interface OrderItem {
  id: string
  orderId?: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string | null
  status: OrderItemStatus
  product: Product
  isNew?: boolean
  createdAt?: string
  updatedAt?: string
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED' | 'PAID' | 'COMPLETED'

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  type: OrderType
  customerName?: string | null
  customerDni?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  customerAddressReference?: string | null
  notes?: string | null
  userId: string
  user: {
    id?: string
    name: string
    username?: string
    role?: string
  }
  tableId?: string | null
  table?: { 
    id: string
    number: number 
    status: TableStatus
    capacity: number
  } | null
  orderItems: OrderItem[]
  invoice?: any
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatedOrder {
  id: string
  orderNumber: string
  totalAmount?: number | string
  table?: {
    id: string
    number: number
  } | null
}

// --- TIPOS DE IMPRESORAS ---

export type PrinterType = 'KITCHEN' | 'RECEIPT' | 'FISCAL'
export type PrinterConnectionType = 'NETWORK' | 'USB' | 'BLUETOOTH' | 'SERIAL'
export type PrinterStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE'

export interface Printer {
  id: string
  name: string
  type: PrinterType
  connectionType: PrinterConnectionType
  status: PrinterStatus
  ipAddress?: string | null
  port?: number | null
  usbPath?: string | null
  serialPort?: string | null
  bluetoothAddress?: string | null
  paperWidth: number
  charactersPerLine: number
  isDefault: boolean
  description?: string | null
  location?: string | null
}
