import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!["ADMIN", "JEFE"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "day"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit
    const statusFilter = searchParams.get("status") || "all" // all, completed, cancelled

    // Fechas personalizadas
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const yearParam = searchParams.get("year")

    const now = new Date()
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear()

      switch (filter) {
        case "all":
          startDate = new Date(targetYear, 0, 1)
          endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
          break
        case "week":
          startDate = new Date()
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(targetYear, now.getMonth(), 1)
          break
        case "year":
          startDate = new Date(targetYear, 0, 1)
          break
        default: // "day"
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
      }

      // Si se especifica un año diferente al actual, ajustar las fechas
      if (yearParam && parseInt(yearParam) !== now.getFullYear()) {
        if (filter === "day") {
          // Para "día" con año específico, mostrar todo el año
          startDate = new Date(targetYear, 0, 1)
          endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        } else if (filter === "month") {
          // Para "mes" con año específico, mostrar el mes actual de ese año
          endDate = new Date(targetYear, now.getMonth() + 1, 0, 23, 59, 59, 999)
        } else if (filter === "year" || filter === "all") {
          endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        } else {
          endDate = now
        }
      } else {
        if (filter === "all") {
          // Para "Todo" sin año específico, usar el año actual completo
          endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        } else {
          endDate = now
        }
      }
    }

    // Configurar filtro de estado
    let statusCondition: any
    switch (statusFilter) {
      case "completed":
        statusCondition = "COMPLETED"
        break
      case "cancelled":
        statusCondition = "CANCELLED"
        break
      default: // "all"
        statusCondition = { in: ["COMPLETED", "CANCELLED"] }
    }

    // Obtener ventas paginadas y estadísticas completas por separado
    const [
      sales,
      totalOrders,
      allSalesForStats,
      topProductsRaw,
      topWaitersRaw,
      paymentMethodsRaw
    ] = await Promise.all([
      // Ventas paginadas para mostrar en la tabla
      prisma.order.findMany({
        where: {
          status: statusCondition,
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          table: { select: { number: true } },
          user: { select: { name: true, username: true } },
          orderItems: {
            include: { product: { select: { name: true, price: true } } }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      // Contar total de órdenes
      prisma.order.count({
        where: {
          status: statusCondition,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      // Obtener TODAS las ventas del período para calcular estadísticas correctas
      prisma.order.findMany({
        where: {
          status: statusCondition,
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          status: true,
          totalAmount: true,
          createdAt: true,
          type: true
        }
      }),
      // Productos más vendidos
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate }
          }
        },
        _sum: {
          quantity: true,
          subtotal: true
        },
        orderBy: {
          _sum: {
            quantity: "desc"
          }
        },
        take: 5
      }),
      // Rendimiento de meseros (Top Waiters)
      prisma.order.groupBy({
        by: ["userId"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true
        },
        orderBy: {
          _sum: {
            totalAmount: "desc"
          }
        },
        take: 5
      }),
      // Métodos de pago de las facturas emitidas para pedidos completados
      prisma.invoice.groupBy({
        by: ["paymentMethod"],
        where: {
          status: "ISSUED",
          order: {
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate }
          }
        },
        _count: {
          id: true
        },
        _sum: {
          total: true
        }
      })
    ])

    const totalPages = Math.ceil(totalOrders / limit)

    // Calcular estadísticas con TODAS las ventas del período, no solo las de la página actual
    const completedSales = allSalesForStats.filter((sale) => sale.status === "COMPLETED")
    const cancelledSales = allSalesForStats.filter((sale) => sale.status === "CANCELLED")

    const totalSales = completedSales.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const totalCancelled = cancelledSales.length
    const averageTicket = completedSales.length > 0 ? totalSales / completedSales.length : 0

    // Consultar nombres de productos y meseros en paralelo para resolver IDs
    const productIds = topProductsRaw.map((p) => p.productId)
    const userIds = topWaitersRaw.map((w) => w.userId)

    const [products, users] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      })
    ])

    // Resolver Top Products
    const topProducts = topProductsRaw.map((item) => {
      const prod = products.find((p) => p.id === item.productId)
      return {
        name: prod?.name || "Producto desconocido",
        quantity: item._sum.quantity || 0,
        revenue: Number(item._sum.subtotal || 0)
      }
    })

    // Resolver Top Waiters
    const topWaiters = topWaitersRaw.map((item) => {
      const user = users.find((u) => u.id === item.userId)
      return {
        name: user?.name || "Usuario desconocido",
        orders: item._count.id || 0,
        revenue: Number(item._sum.totalAmount || 0)
      }
    })

    // Resolver Payment Methods
    const paymentMethods = paymentMethodsRaw.map((item) => ({
      method: item.paymentMethod,
      count: item._count.id || 0,
      revenue: Number(item._sum.total || 0)
    }))

    // Calcular en memoria Ventas por Tipo de Atención
    const typeMap = new Map<string, { count: number; revenue: number }>()
    for (const sale of completedSales) {
      const type = sale.type || "MESA"
      const existing = typeMap.get(type) || { count: 0, revenue: 0 }
      typeMap.set(type, {
        count: existing.count + 1,
        revenue: existing.revenue + Number(sale.totalAmount)
      })
    }
    const orderTypes = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      revenue: data.revenue
    }))

    // Calcular en memoria Ventas por Hora (Peak Hours)
    const hourMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0, orders: 0 }))
    for (const sale of completedSales) {
      const hour = new Date(sale.createdAt).getHours()
      hourMap[hour].sales += Number(sale.totalAmount)
      hourMap[hour].orders += 1
    }

    return NextResponse.json({
      sales,
      stats: { 
        totalSales, 
        totalOrders, 
        averageTicket,
        completedOrders: completedSales.length,
        cancelledOrders: totalCancelled,
        topProducts,
        topWaiters,
        paymentMethods,
        orderTypes,
        salesByHour: hourMap
      },
      totalPages
    })
  } catch (error) {
    console.error("Error al obtener historial de ventas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

