import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener todas las mesas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const tables = await prisma.table.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' }
    })

    return NextResponse.json(tables)
  } catch (error) {
    console.error("Error al obtener mesas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST - Crear nueva mesa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.number || !body.capacity) {
      return NextResponse.json(
        { error: "Número y capacidad son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el número de mesa no exista (solo entre mesas activas)
    const existingTable = await prisma.table.findFirst({
      where: { 
        number: parseInt(body.number),
        isActive: true
      }
    })

    if (existingTable) {
      return NextResponse.json(
        { error: "Ya existe una mesa con ese número" },
        { status: 400 }
      )
    }

    // Crear la mesa
    const table = await prisma.table.create({
      data: {
        number: parseInt(body.number),
        capacity: parseInt(body.capacity),
        status: "DISPONIBLE",
        isActive: true,
      }
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("Error al crear mesa:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
