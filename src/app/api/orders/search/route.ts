import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const status = searchParams.get('status')
    const withoutInvoice = searchParams.get('withoutInvoice') === 'true'
    const showAll = searchParams.get('showAll') === 'true'

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Construir filtros de búsqueda
    const whereConditions: any = {
      OR: [
        {
          orderNumber: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          table: {
            number: {
              equals: isNaN(parseInt(query)) ? undefined : parseInt(query)
            }
          }
        }
      ]
    }

    // Filtrar por estado si se especifica
    if (status) {
      whereConditions.status = status
    }

    // Filtrar pedidos sin factura si se especifica
    if (withoutInvoice) {
      whereConditions.receipts = {
        none: {
          type: 'FACTURA'
        }
      }
    }

    // Si showAll es false, filtrar por usuario específico
    if (!showAll) {
      whereConditions.userId = session.user.id
    }

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        table: {
          select: {
            number: true
          }
        },
        invoice: {
          select: {
            id: true,
            type: true,
            number: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limitar resultados
    })

    // Formatear respuesta
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      type: order.type,
      table: order.table,
      createdAt: order.createdAt.toISOString(),
      hasInvoice: order.invoice?.type === 'FACTURA'
    }))

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      total: formattedOrders.length
    })

  } catch (error) {
    console.error('Error searching orders:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}