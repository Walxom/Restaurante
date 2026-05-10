export interface Product {
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

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export interface CustomerData {
  name: string
  phone: string
  address: string
  addressReference: string
}

export type OrderType = 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'

export interface CreatedOrder {
  id: string
  orderNumber: string
}
