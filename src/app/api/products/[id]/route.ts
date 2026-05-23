import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import * as ProductService from "@/services/product.service"

// GET - Obtener producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const resolvedParams = await params
    const product = await ProductService.findById(resolvedParams.id)

    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error al obtener producto:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PATCH - Actualizar producto
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const resolvedParams = await params
    
    const product = await ProductService.update(resolvedParams.id, body)
    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error al actualizar producto:", error)
    const status = error.message?.includes("encontrado") ? 404 : 400
    return NextResponse.json({ error: error.message || "Error interno" }, { status })
  }
}

// DELETE - Eliminar producto (Hard o Soft según historial)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const resolvedParams = await params
    await ProductService.remove(resolvedParams.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al eliminar producto:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
