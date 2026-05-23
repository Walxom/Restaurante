import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import * as TableService from "@/services/table.service"
import { createTableSchema } from "@/features/tables/validations/table"

// GET - Obtener todas las mesas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const tables = await TableService.findAllActive()
    return NextResponse.json(tables)
  } catch (error) {
    console.error("Error al obtener mesas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nueva mesa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()

    // Validar con Zod
    const validation = createTableSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.issues },
        { status: 400 }
      )
    }

    const table = await TableService.create(validation.data)
    return NextResponse.json(table)
  } catch (error: any) {
    console.error("Error al crear mesa:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: error.message?.includes("Ya existe") ? 400 : 500 }
    )
  }
}
