import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCategorySchema } from "@/features/menu/validations/category"

// GET - Obtener todas las categorías
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('showAll') === 'true'

    // Para administradores (JEFE), mostrar todas si se solicita
    // Para meseros, solo mostrar activas
    const whereCondition = (session.user.role === "JEFE" && showAll)
      ? {} // Mostrar todas (activas e inactivas)
      : { isActive: true } // Solo activas

    const categories = await prisma.category.findMany({
      where: whereCondition,
      include: {
        products: {
          where: { isActive: true },
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Agregar contador de productos
    const categoriesWithCount = categories.map((category: any) => ({
      ...category,
      productCount: category.products.length,
      products: undefined // Remover los productos del response
    }))

    return NextResponse.json(categoriesWithCount)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden crear categorías" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validar con Zod
    const validation = createCategorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos de categoría inválidos", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, description } = validation.data

    // Verificar que el nombre no esté ya en uso
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        isActive: true
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 400 }
      )
    }

    // Crear la categoría
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: true,
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error al crear categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

