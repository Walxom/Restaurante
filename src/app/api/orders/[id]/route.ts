import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emitOrderUpdate } from '@/lib/socket-events'
import { updateOrderSchema } from '@/features/orders/validations/order'
import * as OrderService from '@/services/order.service'

// GET /api/orders/[id] - Obtener pedido específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const order = await OrderService.findById(id)

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos básicos
    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json(
        { error: 'No autorizado para ver este pedido' },
        { status: 403 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error al obtener pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Actualizar pedido
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // 1. Validar con Zod
    const validation = updateOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de actualización inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    // 2. Verificar existencia y permisos
    const existingOrder = await OrderService.findById(id)
    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 3. Reglas de negocio básicas antes de llamar al servicio
    if (existingOrder.status === 'CANCELLED') {
      return NextResponse.json({ error: 'No se pueden editar pedidos cancelados' }, { status: 400 })
    }

    if (existingOrder.status === 'COMPLETED' && validation.data.items) {
      return NextResponse.json({ error: 'No se pueden modificar items de pedidos completados' }, { status: 400 })
    }

    // 4. Actualizar pedido usando el servicio (incluye transacción e items)
    const updatedOrder = await OrderService.update(id, validation.data)

    // 5. Emitir evento de Socket.IO
    emitOrderUpdate(updatedOrder)

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error('Error al actualizar pedido:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Cancelar pedido
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const order = await OrderService.findById(id)

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (['COMPLETED', 'SERVED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'No se puede cancelar un pedido completado o servido' },
        { status: 400 }
      )
    }

    // Cancelar usando el servicio
    const cancelledOrder = await OrderService.cancel(id)
    
    // Emitir evento
    emitOrderUpdate(cancelledOrder)

    return NextResponse.json(cancelledOrder)
  } catch (error: any) {
    console.error('Error al cancelar pedido:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
