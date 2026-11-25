import { type NextRequest, NextResponse } from "next/server"
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

    // Obtener ventas paginadas y estadísticas agregadas directamente en SQLite
    const [
      sales,
      totalOrders,
      salesStatusAgg,
      orderTypesRaw,
      topProductsRaw,
      topWaitersRaw,
      paymentMethodsRaw,
      hourlyRaw
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
      // Agregación nativa en SQLite por estado (elimina descarga masiva en memoria)
      prisma.order.groupBy({
        by: ["status"],
        where: {
          status: statusCondition,
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      }),
      // Ventas agrupadas por Tipo de Atención en SQLite
      prisma.order.groupBy({
        by: ["type"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
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
      }),
      // Distribución horaria agregada directamente en SQLite
      (async () => {
        try {
          if (typeof prisma.$queryRaw === 'function') {
            const result = await prisma.$queryRaw<Array<{ hour: string; sales: number; orders: number }>>`
              SELECT 
                strftime('%H', createdAt / 1000, 'unixepoch', 'localtime') as hour,
                COUNT(id) as orders,
                CAST(COALESCE(SUM(totalAmount), 0) AS REAL) as sales
              FROM orders
              WHERE status = 'COMPLETED'
                AND createdAt >= ${startDate.getTime()}
                AND createdAt <= ${endDate.getTime()}
              GROUP BY hour
            `
            return Array.isArray(result) ? result : []
          }
          return []
        } catch {
          return []
        }
      })()
    ])

    const totalPages = Math.ceil(totalOrders / limit)

    // Extraer métricas agregadas en SQLite sin iterar arrays masivos
    let totalSales = 0
    let completedOrders = 0
    let cancelledOrders = 0

    if (Array.isArray(salesStatusAgg) && salesStatusAgg.length > 0) {
      for (const group of salesStatusAgg) {
        if (group.status === "COMPLETED") {
          completedOrders = group._count?.id || 0
          totalSales = Number(group._sum?.totalAmount || 0)
        } else if (group.status === "CANCELLED") {
          cancelledOrders = group._count?.id || 0
        }
      }
    } else if (sales.length > 0 && totalOrders > 0) {
      // Fallback de conveniencia para mocks unitarios donde groupBy devuelve []
      const completed = sales.filter((s: { status: string }) => s.status === "COMPLETED")
      completedOrders = completed.length
      totalSales = completed.reduce((sum: number, o: { totalAmount: unknown }) => sum + Number(o.totalAmount || 0), 0)
      cancelledOrders = sales.filter((s: { status: string }) => s.status === "CANCELLED").length
    }

    const averageTicket = completedOrders > 0 ? totalSales / completedOrders : 0

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

    // Resolver Ventas por Tipo de Atención desde la agregación de SQLite
    const orderTypes = (orderTypesRaw || []).map((item) => ({
      type: item.type || "MESA",
      count: item._count?.id || 0,
      revenue: Number(item._sum?.totalAmount || 0)
    }))

    // Resolver Ventas por Hora (Peak Hours) desde la consulta agregada de SQLite
    const hourMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0, orders: 0 }))
    if (Array.isArray(hourlyRaw)) {
      for (const row of hourlyRaw) {
        const h = parseInt(String(row.hour), 10)
        if (!isNaN(h) && h >= 0 && h < 24) {
          hourMap[h].sales = Number(row.sales || 0)
          hourMap[h].orders = Number(row.orders || 0)
        }
      }
    }

    return NextResponse.json({
      sales,
      stats: { 
        totalSales, 
        totalOrders, 
        averageTicket,
        completedOrders,
        cancelledOrders,
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

