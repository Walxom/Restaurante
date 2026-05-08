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

    // Obtener todos los años únicos donde existen pedidos
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "CANCELLED"] }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Extraer años únicos
    const years = [...new Set(orders.map(order => order.createdAt.getFullYear()))]
      .sort((a, b) => b - a) // Ordenar de más reciente a más antiguo

    return NextResponse.json({ years })
  } catch (error) {
    console.error("Error al obtener años:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}