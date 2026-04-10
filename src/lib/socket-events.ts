import { emitToRoom, emitToAll } from './socket-server'

// Helper functions para emitir eventos de Socket.IO

// Función para emitir eventos cuando no tenemos acceso directo al servidor Socket.IO
export function emitSocketEvent(event: string, data: any, room?: string) {
  if (room) {
    emitToRoom(room, event, data)
  } else {
    emitToAll(event, data)
  }
}

// Eventos específicos para pedidos
export function emitNewOrder(order: any) {
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

export function emitOrderUpdate(order: any) {
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

export function emitOrderStatusChange(orderId: string, oldStatus: string, newStatus: string, orderData?: any) {
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
export function emitTableUpdate(table: any) {
  emitSocketEvent('table_updated', {
    id: table.id,
    number: table.number,
    capacity: table.capacity,
    status: table.status,
    isActive: table.isActive,
    updatedAt: new Date().toISOString()
  }, 'tables')
}

export function emitTableStatusChange(tableId: string, oldStatus: string, newStatus: string, tableData?: any) {
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

export function emitOrderItemUpdate(orderId: string, itemId: string, action: 'added' | 'updated' | 'removed', itemData?: any) {
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
  var io: any
}