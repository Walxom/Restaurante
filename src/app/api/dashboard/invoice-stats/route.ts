import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener fecha de hoy
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Estadísticas de facturas del día
    const [todayInvoices, todayRevenue, pendingOrders, recentInvoices] = await Promise.all([
      // Cantidad de facturas hoy
      prisma.invoice.count({
        where: {
          issuedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'ISSUED'
        }
      }),

      // Ingresos del día
      prisma.invoice.aggregate({
        where: {
          issuedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'ISSUED'
        },
        _sum: {
          total: true
        }
      }),

      // Pedidos completados sin factura
      prisma.order.count({
        where: {
          status: 'COMPLETED',
          invoice: null
        }
      }),

      // Últimas 5 facturas
      prisma.invoice.findMany({
        where: {
          issuedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'ISSUED'
        },
        select: {
          id: true,
          number: true,
          type: true,
          total: true,
          customerName: true,
          issuedAt: true
        },
        orderBy: {
          issuedAt: 'desc'
        },
        take: 5
      })
    ])

    // Calcular ticket promedio
    const totalRevenue = Number(todayRevenue._sum.total) || 0
    const averageTicket = todayInvoices > 0 ? totalRevenue / todayInvoices : 0

    const stats = {
      todayInvoices,
      todayRevenue: Number(totalRevenue),
      pendingOrders,
      averageTicket: Number(averageTicket),
      recentInvoices: recentInvoices.map((invoice: any) => ({
        ...invoice,
        total: Number(invoice.total),
        issuedAt: invoice.issuedAt.toISOString()
      }))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching invoice stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
