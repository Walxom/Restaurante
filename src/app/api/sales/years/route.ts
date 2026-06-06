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
    const years = [...new Set(orders.map((order: { createdAt: Date }) => order.createdAt.getFullYear()))]
      .sort((a, b) => (a as number) - (b as number)) // Ordenar de más reciente a más antiguo

    return NextResponse.json({ years })
  } catch (error) {
    console.error("Error al obtener años:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
