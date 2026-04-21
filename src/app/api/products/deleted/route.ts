import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/products/deleted - Obtener productos eliminados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden ver productos eliminados" },
        { status: 403 }
      )
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    // Construir filtros para productos eliminados
    const where: Record<string, unknown> = { isActive: false }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      }

    const deletedProducts = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        },
        orderItems: {
          select: { id: true }
        }
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    // Agregar información sobre si el producto tiene historial de pedidos
    const productsWithHistory = deletedProducts.map(product => ({
      ...product,
      hasOrderHistory: product.orderItems.length > 0,
      orderCount: product.orderItems.length
    }))

    return NextResponse.json(productsWithHistory)
  } catch (error) {
    console.error("Error al obtener productos eliminados:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PATCH /api/products/deleted - Reactivar producto eliminado
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden reactivar productos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: "ID del producto es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el producto existe y está eliminado
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    if (product.isActive) {
      return NextResponse.json(
        { error: "El producto ya está activo" },
        { status: 400 }
      )
    }

    // Verificar que no exista otro producto activo con el mismo nombre en la misma categoría
    const existingActiveProduct = await prisma.product.findFirst({
      where: {
        name: product.name,
        categoryId: product.categoryId,
        isActive: true,
        id: { not: productId }
      }
    })

    if (existingActiveProduct) {
      return NextResponse.json(
        { error: "Ya existe un producto activo con ese nombre en esta categoría" },
        { status: 400 }
      )
    }

    // Reactivar el producto
    const reactivatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive: true,
        isAvailable: true, // Reactivar también la disponibilidad
        updatedAt: new Date()
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      ...reactivatedProduct,
      message: "Producto reactivado exitosamente"
    })
  } catch (error) {
    console.error("Error al reactivar producto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
