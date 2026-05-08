import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/invoices/stats - Estadísticas de facturación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today" // today | week | month

    let startDate: Date
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    switch (period) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      default:
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
    }

    const where = {
      status: "ISSUED" as const,
      issuedAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Consultas paralelas para estadísticas
    const [
      totalInvoices,
      totalRevenue,
      invoicesByType,
      invoicesByPaymentMethod,
      topProducts,
      revenueByDay
    ] = await Promise.all([
      // Total de facturas
      prisma.invoice.count({ where }),
      
      // Total de ingresos
      prisma.invoice.aggregate({
        where,
        _sum: { total: true }
      }),
      
      // Facturas por tipo
      prisma.invoice.groupBy({
        by: ["type"],
        where,
        _count: { type: true },
        _sum: { total: true }
      }),
      
      // Facturas por método de pago
      prisma.invoice.groupBy({
        by: ["paymentMethod"],
        where,
        _count: { paymentMethod: true },
        _sum: { total: true }
      }),
      
      // Productos más vendidos
      prisma.invoiceItem.groupBy({
        by: ["description"],
        where: {
          invoice: {
            status: "ISSUED",
            issuedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5
      }),
      
      // Ingresos por día (últimos 7 días)
      getRevenueByDay(startDate, endDate)
    ])

    const stats = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalInvoices,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        averageTicket: totalInvoices > 0 
          ? Number(totalRevenue._sum.total || 0) / totalInvoices 
          : 0
      },
      byType: invoicesByType.map(item => ({
        type: item.type,
        count: item._count.type,
        revenue: Number(item._sum.total || 0)
      })),
      byPaymentMethod: invoicesByPaymentMethod.map(item => ({
        method: item.paymentMethod,
        count: item._count.paymentMethod,
        revenue: Number(item._sum.total || 0)
      })),
      topProducts: topProducts.map(item => ({
        product: item.description,
        quantity: item._sum.quantity || 0,
        revenue: Number(item._sum.total || 0)
      })),
      revenueByDay
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error("Error fetching invoice stats:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// Función auxiliar para obtener ingresos por día
async function getRevenueByDay(startDate: Date, endDate: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "ISSUED",
      issuedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      issuedAt: true,
      total: true
    }
  })

  // Agrupar por día
  const groupedByDay: Record<string, number> = {}
  
  invoices.forEach(invoice => {
    const day = invoice.issuedAt.toISOString().split('T')[0]
    groupedByDay[day] = (groupedByDay[day] || 0) + Number(invoice.total)
  })

  // Convertir a array ordenado
  return Object.entries(groupedByDay)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
