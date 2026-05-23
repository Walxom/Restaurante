import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import * as ProductService from "@/services/product.service"
import { createProductSchema } from "@/features/menu/validations/product"

// GET - Obtener todos los productos con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      categoryId: searchParams.get('categoryId'),
      isAvailable: searchParams.get('isAvailable') === null ? null : searchParams.get('isAvailable') === 'true',
      search: searchParams.get('search'),
      includeInactive: searchParams.get('includeInactive') === 'true'
    }

    const products = await ProductService.findMany(filters)
    return NextResponse.json(products)
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "Solo los jefes pueden crear productos" }, { status: 403 })
    }

    const body = await request.json()

    // Validar con Zod
    const validation = createProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.issues },
        { status: 400 }
      )
    }

    const product = await ProductService.create(validation.data)
    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error al crear producto:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: error.message?.includes("Ya existe") ? 400 : 500 }
    )
  }
}
