import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



// PATCH - Actualizar categoría
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden editar categorías" },
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

    // Validaciones
    if (body.name && body.name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido" },
        { status: 400 }
      )
    }

    // Si se está cambiando el nombre, verificar que no esté en uso
    if (body.name && body.name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: { 
          name: body.name.trim(),
          isActive: true,
          id: { not: categoryId }
        }
      })

      if (duplicateCategory) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese nombre" },
          { status: 400 }
        )
      }
    }

    // Actualizar la categoría
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("Error al actualizar categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar categoría completamente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden eliminar categorías" },
        { status: 403 }
      )
    }

    // Await params antes de usar sus propiedades
    const resolvedParams = await params
    const categoryId = resolvedParams.id

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: true // Incluir todos los productos, activos e inactivos
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Verificar si tiene productos (cualquier producto, activo o no)
    if (existingCategory.products.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una categoría que tiene productos asociados. Primero elimina todos los productos de esta categoría." },
        { status: 400 }
      )
    }

    // Hard delete - eliminar completamente de la base de datos
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Categoría eliminada completamente de la base de datos"
    })
  } catch (error) {
    console.error("Error al eliminar categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
