import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



// PATCH - Cambiar estado activo/inactivo de categoría
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden cambiar el estado de categorías" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const resolvedParams = await params
    const categoryId = resolvedParams.id

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Validar que se envía el campo isActive
    if (body.isActive === undefined) {
      return NextResponse.json(
        { error: "El campo isActive es requerido" },
        { status: 400 }
      )
    }

    // Actualizar solo el estado isActive
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: body.isActive }
    })

    const action = body.isActive ? "habilitada" : "deshabilitada"
    
    return NextResponse.json({ 
      success: true, 
      message: `Categoría ${action} correctamente`,
      category: updatedCategory
    })
  } catch (error) {
    console.error("Error al cambiar estado de categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
