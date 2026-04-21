import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener todos los productos
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
    const categoryId = searchParams.get('categoryId')
    const isAvailable = searchParams.get('isAvailable')
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Construir filtros
    const where: Record<string, unknown> = {}
    
    // Por defecto solo productos activos, pero si se especifica includeInactive, mostrar todos
    if (!includeInactive) {
      where.isActive = true
    }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (isAvailable !== null) {
      where.isAvailable = isAvailable === 'true'
    }
    
    if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      }

    const products = await prisma.product.findMany({
      where,
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
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden crear productos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validaciones
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre del producto es requerido" },
        { status: 400 }
      )
    }

    if (!body.price || body.price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0" },
        { status: 400 }
      )
    }

    if (!body.categoryId) {
      return NextResponse.json(
        { error: "La categoría es requerida" },
        { status: 400 }
      )
    }

    // Verificar que la categoría existe
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

    // Verificar que el nombre no esté ya en uso en la misma categoría (solo productos activos)
    const existingActiveProduct = await prisma.product.findFirst({
      where: { 
        name: body.name.trim(),
        categoryId: body.categoryId,
        isActive: true 
      }
    })

    if (existingActiveProduct) {
      return NextResponse.json(
        { error: "Ya existe un producto activo con ese nombre en esta categoría" },
        { status: 400 }
      )
    }

    // Buscar producto eliminado (inactivo) con el mismo nombre para reactivarlo
    const inactiveProduct = await prisma.product.findFirst({
      where: { 
        name: body.name.trim(),
        categoryId: body.categoryId,
        isActive: false 
      }
    })

    let product;

    if (inactiveProduct) {
      // Reactivar producto existente usando transacción
      product = await prisma.$transaction(async (tx) => {
        const updatedProduct = await tx.product.update({
          where: { id: inactiveProduct.id },
          data: {
            description: body.description?.trim() || null,
            price: parseFloat(body.price),
            isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
            isActive: true,
            updatedAt: new Date()
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
        if (body.recipe) {
          // Eliminar receta existente si existe
          await tx.recipe.deleteMany({
            where: { productId: updatedProduct.id }
          })

          // Crear nueva receta
          await tx.recipe.create({
            data: {
              productId: updatedProduct.id,
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

        return updatedProduct
      })

      return NextResponse.json({ 
        ...product, 
        wasReactivated: true,
        message: "Producto reactivado exitosamente" 
      })
    } else {
      // Crear nuevo producto usando transacción
      product = await prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: {
            name: body.name.trim(),
            description: body.description?.trim() || null,
            price: parseFloat(body.price),
            categoryId: body.categoryId,
            isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
            isActive: true,
          },
          include: {
            category: {
              select: { id: true, name: true }
            }
          }
        })

        // Crear receta si se proporciona
        if (body.recipe && body.recipe.ingredients && body.recipe.ingredients.length > 0) {
          await tx.recipe.create({
            data: {
              productId: newProduct.id,
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

        return newProduct
      })

      return NextResponse.json(product)
    }
  } catch (error) {
    console.error("Error al crear producto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
