import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"



// POST /api/orders/[id]/items - Agregar item al pedido
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await context.params
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError)
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }
    const { productId, quantity, notes } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'ProductId y quantity son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (session.user.role === 'MESERO' && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado para modificar este pedido' },
        { status: 403 }
      )
    }

    // Solo permitir edición si el pedido está en estado PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden agregar items a pedidos pendientes' },
        { status: 400 }
      )
    }

    // Verificar que el producto existe y está disponible
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product || !product.isActive || !product.isAvailable) {
      return NextResponse.json(
        { error: 'Producto no disponible' },
        { status: 400 }
      )
    }

    // Verificar si el item ya existe en el pedido
    const existingItem = await prisma.orderItem.findFirst({
      where: {
        orderId,
        productId
      }
    })

    let orderItem
    let newTotalAmount

    if (existingItem) {
      // Si existe, actualizar cantidad
      const newQuantity = existingItem.quantity + quantity
      const newSubtotal = Number(product.price) * newQuantity

      orderItem = await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal: newSubtotal,
          notes: notes || existingItem.notes
        },
        include: {
          product: {
            select: {
              name: true,
              price: true
            }
          }
        }
      })

      // Actualizar total del pedido
      const totalDifference = newSubtotal - Number(existingItem.subtotal)
      newTotalAmount = Number(order.totalAmount) + totalDifference
    } else {
      // Si no existe, crear nuevo item
      const subtotal = Number(product.price) * quantity

      orderItem = await prisma.orderItem.create({
        data: {
          orderId,
          productId,
          quantity,
          unitPrice: product.price,
          subtotal,
          notes: notes || null
        },
        include: {
          product: {
            select: {
              name: true,
              price: true
            }
          }
        }
      })

      // Actualizar total del pedido
      newTotalAmount = Number(order.totalAmount) + subtotal
    }

    // Actualizar el total del pedido
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotalAmount }
    })

    return NextResponse.json(orderItem, { status: 201 })
  } catch (error) {
    console.error('Error al agregar item al pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id]/items/[itemId] - Actualizar item del pedido
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; itemId?: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await context.params
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError)
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }
    const { itemId, quantity, notes } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'ItemId es requerido' },
        { status: 400 }
      )
    }

    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (session.user.role === 'MESERO' && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado para modificar este pedido' },
        { status: 403 }
      )
    }

    // Solo permitir edición si el pedido está en estado PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden editar items de pedidos pendientes' },
        { status: 400 }
      )
    }

    // Verificar que el item existe
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId
      },
      include: {
        product: true
      }
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Item no encontrado en el pedido' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {}
    let totalDifference = 0

    if (quantity !== undefined) {
      const newSubtotal = Number(orderItem.product.price) * quantity
      updateData.quantity = quantity
      updateData.subtotal = newSubtotal
      totalDifference = newSubtotal - Number(orderItem.subtotal)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Actualizar el item en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el item
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          product: {
            select: {
              name: true,
              price: true
            }
          }
        }
      })

      // Actualizar total del pedido si cambió la cantidad
      if (totalDifference !== 0) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            totalAmount: Number(order.totalAmount) + totalDifference
          }
        })
      }

      return updatedItem
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al actualizar item del pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id]/items/[itemId] - Eliminar item del pedido
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await context.params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'ItemId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (session.user.role === 'MESERO' && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado para modificar este pedido' },
        { status: 403 }
      )
    }

    // Solo permitir edición si el pedido está en estado PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar items de pedidos pendientes' },
        { status: 400 }
      )
    }

    // Verificar que el item existe
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId
      }
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Item no encontrado en el pedido' },
        { status: 404 }
      )
    }

    // Verificar que no sea el último item del pedido
    const itemCount = await prisma.orderItem.count({
      where: { orderId }
    })

    if (itemCount <= 1) {
      return NextResponse.json(
        { error: 'No se puede eliminar el último item del pedido' },
        { status: 400 }
      )
    }

    // Eliminar el item y actualizar total
    const result = await prisma.$transaction(async (tx) => {
      // Eliminar el item
      await tx.orderItem.delete({
        where: { id: itemId }
      })

      // Actualizar total del pedido
      const newTotal = Number(order.totalAmount) - Number(orderItem.subtotal)
      await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: newTotal }
      })

      return { message: 'Item eliminado exitosamente', subtotalRemoved: orderItem.subtotal }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al eliminar item del pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
