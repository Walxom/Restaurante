import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { type Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrderSchema } from '@/features/orders/validations/order'
import { emitNewOrder, emitTableStatusChange } from '@/lib/socket-events'

// Función para generar número de orden único
function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${year}${month}${day}${random}`
}

// GET /api/orders - Obtener pedidos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const tableId = searchParams.get('tableId')
    const showAll = searchParams.get('showAll') === 'true'
    const withoutInvoice = searchParams.get('withoutInvoice') === 'true'
    const date = searchParams.get('date')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '200')))

    const where: Prisma.OrderWhereInput = {}
    
    // Filtro por fecha (solo para pedidos completados y cancelados)
    if (date && status !== 'active' && status !== 'ACTIVE') {
      // Crear fechas en UTC para evitar problemas de zona horaria
      const startOfDay = new Date(date + 'T00:00:00.000Z')
      const endOfDay = new Date(date + 'T23:59:59.999Z')
      
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      }
    }
    
    if (status === 'active') {
      // Filtro para pedidos activos (no completados ni cancelados)
      // Los pedidos activos se muestran sin restricción de fecha
      where.status = {
        notIn: ['COMPLETED', 'CANCELLED']
      }
    } else if (status === 'completed' || status === 'COMPLETED') {
      // Filtro para pedidos completados
      where.status = 'COMPLETED'
    } else if (status === 'cancelled' || status === 'CANCELLED') {
      // Filtro para pedidos cancelados
      where.status = 'CANCELLED'
    } else if (status) {
      where.status = status
    }
    
    // Filtro para pedidos sin factura
    if (withoutInvoice) {
      where.invoice = null
    }
    
    // Si showAll es true, mostrar todos los pedidos independientemente del rol
    // Si showAll es false, filtrar por usuario específico
    if (!showAll) {
      if (userId) {
        where.userId = userId
      } else {
        // Si no se especifica userId y showAll es false, mostrar solo los pedidos del usuario actual
        where.userId = session.user.id
      }
    }
    
    if (tableId) {
      where.tableId = tableId
    }

    const include = {
      table: { select: { number: true, capacity: true } },
      user: { select: { name: true, username: true } },
      orderItems: {
        include: {
          product: {
            select: { name: true, price: true, category: { select: { name: true } } }
          }
        },
        orderBy: { createdAt: 'asc' as const }
      },
      invoice: { select: { id: true, type: true, number: true } }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error al obtener pedidos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar con Zod
    const validation = createOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de pedido inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { 
      tableId, 
      type, 
      customerName, 
      customerDni, 
      customerPhone, 
      customerAddress, 
      customerAddressReference, 
      notes, 
      items, 
      isAdditionalOrder 
    } = validation.data

    // Verificar que la mesa esté disponible o permitir pedidos adicionales en mesas ocupadas
    if (tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId }
      })

      if (!table) {
        return NextResponse.json(
          { error: 'Mesa no encontrada' },
          { status: 404 }
        )
      }

      // Permitir crear pedidos en mesas DISPONIBLE, ESPERANDO o OCUPADA (para pedidos adicionales)
      if (!['DISPONIBLE', 'ESPERANDO', 'OCUPADA'].includes(table.status)) {
        return NextResponse.json(
          { error: 'La mesa no está disponible para nuevos pedidos' },
          { status: 400 }
        )
      }

      // Si la mesa está esperando u ocupada, debe ser un pedido adicional
      if ((table.status === 'ESPERANDO' || table.status === 'OCUPADA') && !isAdditionalOrder) {
        return NextResponse.json(
          { error: 'La mesa ya tiene pedidos. Use la opción de pedido adicional.' },
          { status: 400 }
        )
      }
    }

    // Obtener información de productos para calcular totales
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        isAvailable: true
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Algunos productos no están disponibles' },
        { status: 400 }
      )
    }

    // Calcular totales
    let totalAmount = 0
    const orderItemsData = items.map((item: { productId: string; quantity: number; notes?: string | null }) => {
      const product = products.find((p: { id: string }) => p.id === item.productId)
      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado`)
      }
      
      const subtotal = Number(product.price) * item.quantity
      totalAmount += subtotal

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: subtotal,
        notes: item.notes || null
      }
    })

    // Generar número de orden único
    let orderNumber = generateOrderNumber()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber }
      })
      if (!existing) break
      orderNumber = generateOrderNumber()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Error al generar número de orden' },
        { status: 500 }
      )
    }

    // Crear el pedido con sus items en una transacción
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Crear el pedido directamente en estado CONFIRMED
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type,
          userId: session.user.id,
          tableId: tableId || null,
          customerName: customerName || null,
          customerDni: customerDni || null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          customerAddressReference: customerAddressReference || null,
          status: 'CONFIRMED',
          notes: notes || null,
          totalAmount,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          table: {
            select: {
              number: true,
              capacity: true
            }
          },
          user: {
            select: {
              name: true,
              username: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true,
                  category: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      // Actualizar estado de la mesa según el flujo correcto
      if (tableId && !isAdditionalOrder) {
        const currentTable = await tx.table.findUnique({
          where: { id: tableId }
        })
        
        // DISPONIBLE → ESPERANDO cuando se crea el primer pedido
        if (currentTable?.status === 'DISPONIBLE') {
          const updatedTable = await tx.table.update({
            where: { id: tableId },
            data: { status: 'ESPERANDO' }
          })
          
          // Emitir evento de cambio de estado de mesa
          emitTableStatusChange(tableId, 'DISPONIBLE', 'ESPERANDO', {
            number: currentTable.number,
            capacity: currentTable.capacity
          })
        }
      }

      return newOrder
    })

    // Emitir evento de Socket.IO para nuevo pedido
    emitNewOrder(order)

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
