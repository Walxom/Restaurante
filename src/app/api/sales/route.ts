import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
    const [sales, totalOrders, allSalesForStats] = await Promise.all([
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
          totalAmount: true
        }
      })
    ])

    const totalPages = Math.ceil(totalOrders / limit)
    
    // Calcular estadísticas con TODAS las ventas del período, no solo las de la página actual
    const completedSales = allSalesForStats.filter(sale => sale.status === "COMPLETED")
    const cancelledSales = allSalesForStats.filter(sale => sale.status === "CANCELLED")
    
    const totalSales = completedSales.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const totalCancelled = cancelledSales.length
    const averageTicket = completedSales.length > 0 ? totalSales / completedSales.length : 0

    return NextResponse.json({
      sales,
      stats: { 
        totalSales, 
        totalOrders, 
        averageTicket,
        completedOrders: completedSales.length,
        cancelledOrders: totalCancelled
      },
      totalPages
    })
  } catch (error) {
    console.error("Error al obtener historial de ventas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
