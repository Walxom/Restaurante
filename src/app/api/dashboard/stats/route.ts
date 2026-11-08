import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    // Definir fechas para consultas del día
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)

    // Ejecutar todas las consultas independientes en paralelo con Promise.all
    // para eliminar el cuello de botella de 9 queries secuenciales en SQLite
    const [
      mesasStats,
      pedidosPendientes,
      pedidosServidos,
      ventasPedidosServidos,
      ventasHoy,
      productosActivos,
      totalMesas,
      stockBajoResult,
      activeOrdersAgg
    ] = await Promise.all([
      // 1. Estadísticas de mesas agrupadas por estado
      prisma.table.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true }
      }),

      // 2. Pedidos pendientes (requieren atención activa en cocina)
      prisma.order.count({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
        }
      }),

      // 3. Pedidos servidos del día
      prisma.order.count({
        where: {
          status: 'SERVED',
          createdAt: { gte: hoy, lt: mañana }
        }
      }),

      // 4. Total de ventas operativas del día (pedidos servidos y completados)
      prisma.order.aggregate({
        where: {
          status: { in: ['SERVED', 'COMPLETED'] },
          createdAt: { gte: hoy, lt: mañana }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),

      // 5. Total de ventas fiscales del día (facturas y boletas emitidas)
      prisma.invoice.aggregate({
        where: {
          issuedAt: { gte: hoy, lt: mañana },
          status: 'ISSUED'
        },
        _sum: { total: true },
        _count: { id: true }
      }),

      // 6. Productos activos y disponibles en carta
      prisma.product.count({
        where: { isActive: true, isAvailable: true }
      }),

      // 7. Total de mesas activas configuradas
      prisma.table.count({
        where: { isActive: true }
      }),

      // 8. Ingredientes con stock bajo o crítico
      prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM ingredients 
        WHERE isActive = 1 
        AND currentStock <= minStock
      `,

      // 9. Pedidos activos para métricas en vivo de salón
      prisma.order.aggregate({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      })
    ])

    // Convertir estados de mesas a formato estructurado
    const mesasCount = {
      DISPONIBLE: 0,
      OCUPADA: 0,
      ESPERANDO: 0,
      MANTENIMIENTO: 0,
    }

    mesasStats.forEach((stat: { status: string; _count: { id: number } }) => {
      if (stat.status in mesasCount) {
        mesasCount[stat.status as keyof typeof mesasCount] = stat._count.id
      }
    })

    const rawStock = stockBajoResult as Array<{ count?: number | string }>
    const stockBajo = Number(rawStock[0]?.count || 0)

    // Desglose de ventas fiscales y operativas
    const totalVentasFacturas = Number(ventasHoy._sum.total) || 0
    const totalVentasPedidos = Number(ventasPedidosServidos._sum.totalAmount) || 0
    const cantidadFacturas = ventasHoy._count.id || 0
    const cantidadPedidos = ventasPedidosServidos._count.id || 0

    // Priorizar ventas fiscales si existen comprobantes, o total operativo en su defecto
    const totalVentas = totalVentasFacturas > 0 ? totalVentasFacturas : totalVentasPedidos
    const cantidadVentas = cantidadFacturas > 0 ? cantidadFacturas : cantidadPedidos

    const stats = {
      mesas: mesasCount,
      pedidosPendientes,
      pedidosServidos,
      activeOrders: activeOrdersAgg._count.id || 0,
      totalSales: Number(activeOrdersAgg._sum.totalAmount) || 0,
      ventasHoy: {
        total: totalVentas,
        cantidad: cantidadVentas,
        detalles: {
          facturas: {
            total: totalVentasFacturas,
            cantidad: cantidadFacturas
          },
          pedidos: {
            total: totalVentasPedidos,
            cantidad: cantidadPedidos
          }
        }
      },
      productosActivos,
      totalMesas,
      stockBajo,
      ultimaActualizacion: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}