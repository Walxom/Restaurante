import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



// GET - Obtener producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const product = await prisma.product.findFirst({
      where: { 
        id: resolvedParams.id,
        isActive: true 
      },
      include: {
        category: {
          select: { id: true, name: true }
        },
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: {
                  select: { id: true, name: true, unit: true, currentStock: true }
                }
              }
            }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error al obtener producto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: "Solo los jefes pueden editar productos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const resolvedParams = await params
    const productId = resolvedParams.id

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    // Validaciones
    if (body.name && body.name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre del producto es requerido" },
        { status: 400 }
      )
    }

    if (body.price && body.price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0" },
        { status: 400 }
      )
    }

    // Si se está cambiando la categoría, verificar que existe
    if (body.categoryId && body.categoryId !== existingProduct.categoryId) {
      const category = await prisma.category.findFirst({
        where: { 
          id: body.categoryId,
          isActive: true 
        }
      })

      if (!category) {
        return NextResponse.json(
          { error: "La categoría seleccionada no existe o está inactiva" },
          { status: 400 }
        )
      }
    }

    // Si se está cambiando el nombre, verificar que no esté en uso
    if (body.name && body.name.trim() !== existingProduct.name) {
      const duplicateProduct = await prisma.product.findFirst({
        where: { 
          name: body.name.trim(),
          categoryId: body.categoryId || existingProduct.categoryId,
          isActive: true,
          id: { not: productId }
        }
      })

      if (duplicateProduct) {
        return NextResponse.json(
          { error: "Ya existe un producto con ese nombre en esta categoría" },
          { status: 400 }
        )
      }
    }

    // Actualizar el producto usando transacción
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...(body.name && { name: body.name.trim() }),
          ...(body.description !== undefined && { description: body.description?.trim() || null }),
          ...(body.price && { price: parseFloat(body.price) }),
          ...(body.categoryId && { categoryId: body.categoryId }),
          ...(body.isAvailable !== undefined && { isAvailable: body.isAvailable }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: {
          category: {
            select: { id: true, name: true }
          },
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: {
                    select: { id: true, name: true, unit: true, currentStock: true }
                  }
                }
              }
            }
          }
        }
      })

      // Manejar receta si se proporciona
      if (body.recipe !== undefined) {
        // Eliminar receta existente si existe
        await tx.recipe.deleteMany({
          where: { productId: productId }
        })

        // Crear nueva receta si se proporciona
        if (body.recipe && body.recipe.ingredients && body.recipe.ingredients.length > 0) {
          await tx.recipe.create({
            data: {
              productId: productId,
              instructions: body.recipe.instructions,
              prepTime: body.recipe.prepTime,
              servings: body.recipe.servings,
              ingredients: {
                create: body.recipe.ingredients.map((ingredient: any) => ({
                  ingredientId: ingredient.ingredientId,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                  notes: ingredient.notes
                }))
              }
            }
          })
        }
      }

      return product
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error al actualizar producto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar producto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden eliminar productos" },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const productId = resolvedParams.id

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: {
          select: { id: true }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    // Si tiene historial de pedidos, hacer soft delete
    if (existingProduct.orderItems.length > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
      })
    } else {
      // Si no tiene historial, hacer hard delete usando transacción
      await prisma.$transaction(async (tx) => {
        // Eliminar recetas asociadas primero
        await tx.recipe.deleteMany({
          where: { productId: productId }
        })
        
        // Luego eliminar el producto
        await tx.product.delete({
          where: { id: productId }
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar producto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
