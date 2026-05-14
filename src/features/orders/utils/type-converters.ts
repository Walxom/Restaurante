import { Order, OrderStatus, OrderType, OrderItem } from "@/types";

/**
 * Convierte un objeto parcial o mock en un objeto Order válido para componentes de UI
 */
export function createMockOrder(data: Partial<Order>): Order {
  return {
    id: data.id || '',
    orderNumber: data.orderNumber || '0000',
    status: (data.status as OrderStatus) || 'COMPLETED',
    totalAmount: Number(data.totalAmount) || 0,
    type: (data.type as OrderType) || 'MESA',
    userId: data.userId || '',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    notes: data.notes || null,
    customerName: data.customerName || null,
    customerDni: data.customerDni || null,
    customerPhone: data.customerPhone || null,
    tableId: data.tableId || null,
    table: data.table || null,
    orderItems: data.orderItems || [],
    user: data.user || { id: '', name: 'Sistema' },
    invoice: data.invoice || undefined,
    ...data
  };
}

/**
 * Crea un mock de OrderItem
 */
export function createMockOrderItem(data: Partial<OrderItem>): OrderItem {
  return {
    id: data.id || '',
    productId: data.productId || '',
    quantity: data.quantity || 1,
    unitPrice: Number(data.unitPrice) || 0,
    subtotal: Number(data.subtotal) || 0,
    status: data.status || 'SERVED',
    product: data.product || {
      id: '',
      name: 'Producto',
      price: 0,
      categoryId: '',
      isAvailable: true,
      isActive: true,
      category: { id: '', name: '' }
    },
    notes: data.notes || null,
    createdAt: data.createdAt || new Date().toISOString(),
    ...data
  };
}
