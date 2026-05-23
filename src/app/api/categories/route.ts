import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import * as CategoryService from "@/services/category.service"
import { createCategorySchema } from "@/features/menu/validations/category"

// GET - Obtener todas las categorías
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('showAll') === 'true'
    
    // Solo el JEFE puede ver categorías inactivas
    const includeInactive = (session.user.role === "JEFE" && showAll)

    const categories = await CategoryService.findAll(includeInactive)
    
    // Adaptar formato para compatibilidad (productCount)
    const formattedCategories = categories.map((c: any) => ({
      ...c,
      productCount: c._count?.products ?? 0,
      _count: undefined
    }))

    return NextResponse.json(formattedCategories)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()

    // Validar con Zod
    const validation = createCategorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.issues },
        { status: 400 }
      )
    }

    const category = await CategoryService.create(validation.data)
    return NextResponse.json(category)
  } catch (error: any) {
    console.error("Error al crear categoría:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: error.message?.includes("Ya existe") ? 400 : 500 }
    )
  }
}
