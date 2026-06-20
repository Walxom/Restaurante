import type { Server as SocketIOServer } from 'socket.io'
import { emitToRoom, emitToAll } from './socket-server'

// Formas mínimas que estos emisores leen. Son permisivas a propósito: los
// callers pasan objetos Prisma completos (con Decimal/Date), que satisfacen
// estructuralmente estas interfaces sin necesidad de mapear.
interface OrderEventInput {
  id: string
  orderNumber: string
  type: string
  status: string
  tableId?: string | null
  table?: { number?: number | null } | null
  customerName?: string | null
  totalAmount?: unknown
  orderItems?: unknown[] | null
  createdAt?: Date | string
  updatedAt?: Date | string
  user?: { name?: string | null; username?: string | null } | null
}

interface TableEventInput {
  id: string
  number: number
  capacity?: number | null
  status: string
  isActive?: boolean
}

// Helper functions para emitir eventos de Socket.IO

// Función para emitir eventos cuando no tenemos acceso directo al servidor Socket.IO
export function emitSocketEvent(event: string, data: unknown, room?: string) {
  if (room) {
    emitToRoom(room, event, data)
  } else {
    emitToAll(event, data)
  }
}

// Eventos específicos para pedidos
export function emitNewOrder(order: OrderEventInput) {
  emitSocketEvent('new_order', {
    id: order.id,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    tableId: order.tableId,
    tableName: order.table?.number ? `Mesa ${order.table.number}` : null,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    itemsCount: order.orderItems?.length || 0,
    createdAt: order.createdAt,
    user: {
      name: order.user?.name,
      username: order.user?.username
    }
  }, 'orders')
}

export function emitOrderUpdate(order: OrderEventInput) {
  emitSocketEvent('order_updated', {
    id: order.id,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    tableId: order.tableId,
    tableName: order.table?.number ? `Mesa ${order.table.number}` : null,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    itemsCount: order.orderItems?.length || 0,
    updatedAt: order.updatedAt,
    user: {
      name: order.user?.name,
      username: order.user?.username
    }
  }, 'orders')
}

export function emitOrderStatusChange(orderId: string, oldStatus: string, newStatus: string, orderData?: OrderEventInput | null) {
  emitSocketEvent('order_status_changed', {
    orderId,
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString(),
    orderData: orderData ? {
      orderNumber: orderData.orderNumber,
      type: orderData.type,
      tableId: orderData.tableId,
      tableName: orderData.table?.number ? `Mesa ${orderData.table.number}` : null,
      customerName: orderData.customerName
    } : null
  }, 'orders')
}

// Eventos específicos para mesas
export function emitTableUpdate(table: TableEventInput) {
  emitSocketEvent('table_updated', {
    id: table.id,
    number: table.number,
    capacity: table.capacity,
    status: table.status,
    isActive: table.isActive,
    updatedAt: new Date().toISOString()
  }, 'tables')
}

export function emitTableStatusChange(tableId: string, oldStatus: string, newStatus: string, tableData?: { number?: number | null; capacity?: number | null }) {
  emitSocketEvent('table_status_changed', {
    tableId,
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString(),
    tableData: tableData ? {
      number: tableData.number,
      capacity: tableData.capacity
    } : null
  }, 'tables')
}

export function emitOrderItemUpdate(orderId: string, itemId: string, action: 'added' | 'updated' | 'removed', itemData?: unknown) {
  emitSocketEvent('order_item_updated', {
    orderId,
    itemId,
    action,
    timestamp: new Date().toISOString(),
    itemData
  }, 'orders')
}

// Declaración global para TypeScript
declare global {
  var io: SocketIOServer | undefined
}