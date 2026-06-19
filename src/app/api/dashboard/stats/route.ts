import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
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

    // Obtener estadísticas de mesas
    const mesasStats = await prisma.table.groupBy({
      by: ['status'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    })

    // Convertir a formato más fácil de usar
    const mesasCount = {
      DISPONIBLE: 0,
      OCUPADA: 0,
      ESPERANDO: 0,
      POR_LIMPIAR: 0,
      FUERA_DE_SERVICIO: 0
    }

    mesasStats.forEach((stat: { status: string; _count: { id: number } }) => {
      mesasCount[stat.status as keyof typeof mesasCount] = stat._count.id
    })

    // Obtener pedidos pendientes (estados que requieren atención)
    const pedidosPendientes = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
        }
      }
    })

    // Obtener pedidos servidos del día
    const pedidosServidos = await prisma.order.count({
      where: {
        status: 'SERVED',
        createdAt: {
          gte: hoy,
          lt: mañana
        }
      }
    })

    // Obtener total de ventas del día incluyendo pedidos SERVIDO
    const ventasPedidosServidos = await prisma.order.aggregate({
      where: {
        status: {
          in: ['SERVED', 'COMPLETED']
        },
        createdAt: {
          gte: hoy,
          lt: mañana
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    // Obtener ventas del día
    const ventasHoy = await prisma.invoice.aggregate({
      where: {
        issuedAt: {
          gte: hoy,
          lt: mañana
        },
        status: 'ISSUED'
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    })

    // Obtener productos activos
    const productosActivos = await prisma.product.count({
      where: {
        isActive: true,
        isAvailable: true
      }
    })

    // Obtener total de mesas configuradas
    const totalMesas = await prisma.table.count({
      where: {
        isActive: true
      }
    })

    // Obtener ingredientes con stock bajo usando SQL raw
    const stockBajoResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM ingredients 
      WHERE isActive = 1 
      AND currentStock <= minStock
    `
    const stockBajo = Number((stockBajoResult as any)[0]?.count || 0)

    // Combinar ventas de facturas y pedidos servidos/completados
    const totalVentasFacturas = Number(ventasHoy._sum.total) || 0
    const totalVentasPedidos = Number(ventasPedidosServidos._sum.totalAmount) || 0
    const cantidadFacturas = ventasHoy._count.id || 0
    const cantidadPedidos = ventasPedidosServidos._count.id || 0

    const stats = {
      mesas: mesasCount,
      pedidosPendientes,
      pedidosServidos,
      ventasHoy: {
        total: Math.max(totalVentasFacturas, totalVentasPedidos), // Usar el mayor para evitar duplicados
        cantidad: Math.max(cantidadFacturas, cantidadPedidos),
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