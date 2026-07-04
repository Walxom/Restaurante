import { describe, it, expect, vi, beforeEach } from 'vitest'

// El módulo de seguimiento en tiempo real emite eventos vía estos helpers.
vi.mock('@/lib/socket-server', () => ({
  emitToRoom: vi.fn(),
  emitToAll: vi.fn(),
}))

import { emitToRoom } from '@/lib/socket-server'
import {
  emitNewOrder,
  emitOrderUpdate,
  emitOrderStatusChange,
  emitTableUpdate,
  emitTableStatusChange,
  emitOrderItemUpdate,
} from '@/lib/socket-events'

const baseOrder = {
  id: 'o1',
  orderNumber: 'PED-001',
  type: 'MESA',
  status: 'PENDING',
  tableId: 't1',
  table: { number: 3 },
  customerName: 'Jose',
  totalAmount: 8,
  orderItems: [{ id: 'i1' }, { id: 'i2' }],
  createdAt: new Date('2026-06-20T00:00:00Z'),
  updatedAt: new Date('2026-06-20T00:00:00Z'),
  user: { name: 'Jefe', username: 'jefe' },
}

describe('socket-events (seguimiento en tiempo real)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('emitNewOrder emite new_order a la sala orders con el payload mapeado', () => {
    emitNewOrder(baseOrder)
    expect(emitToRoom).toHaveBeenCalledWith(
      'orders',
      'new_order',
      expect.objectContaining({
        id: 'o1',
        orderNumber: 'PED-001',
        tableName: 'Mesa 3',
        itemsCount: 2,
      }),
    )
  })

  it('emitOrderUpdate emite order_updated a la sala orders', () => {
    emitOrderUpdate(baseOrder)
    expect(emitToRoom).toHaveBeenCalledWith(
      'orders',
      'order_updated',
      expect.objectContaining({ id: 'o1', itemsCount: 2 }),
    )
  })

  it('emitOrderStatusChange emite order_status_changed con estados', () => {
    emitOrderStatusChange('o1', 'PENDING', 'CONFIRMED', null)
    expect(emitToRoom).toHaveBeenCalledWith(
      'orders',
      'order_status_changed',
      expect.objectContaining({ orderId: 'o1', oldStatus: 'PENDING', newStatus: 'CONFIRMED', orderData: null }),
    )
  })

  it('emitTableUpdate emite table_updated a la sala tables', () => {
    emitTableUpdate({ id: 't1', number: 3, capacity: 4, status: 'DISPONIBLE', isActive: true })
    expect(emitToRoom).toHaveBeenCalledWith(
      'tables',
      'table_updated',
      expect.objectContaining({ id: 't1', number: 3, status: 'DISPONIBLE' }),
    )
  })

  it('emitTableStatusChange emite table_status_changed', () => {
    emitTableStatusChange('t1', 'DISPONIBLE', 'OCUPADO', { number: 3, capacity: 4 })
    expect(emitToRoom).toHaveBeenCalledWith(
      'tables',
      'table_status_changed',
      expect.objectContaining({ tableId: 't1', oldStatus: 'DISPONIBLE', newStatus: 'OCUPADO' }),
    )
  })

  it('emitOrderItemUpdate emite order_item_updated con la acción', () => {
    emitOrderItemUpdate('o1', 'i1', 'updated', { status: 'SERVED' })
    expect(emitToRoom).toHaveBeenCalledWith(
      'orders',
      'order_item_updated',
      expect.objectContaining({ orderId: 'o1', itemId: 'i1', action: 'updated' }),
    )
  })
})
