import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/ingredients/[id]/restore - Reactivar ingrediente eliminado
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden reactivar ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Verificar que el ingrediente existe y está inactivo
    const ingredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    if (ingredient.isActive) {
      return NextResponse.json(
        { error: 'El ingrediente ya está activo' },
        { status: 400 }
      )
    }

    // Verificar que no existe otro ingrediente activo con el mismo nombre
    const activeIngredient = await prisma.ingredient.findFirst({
      where: {
        name: ingredient.name,
        isActive: true,
        id: { not: id }
      }
    })

    if (activeIngredient) {
      return NextResponse.json(
        { error: 'Ya existe un ingrediente activo con ese nombre' },
        { status: 400 }
      )
    }

    // Reactivar el ingrediente
    const restoredIngredient = await prisma.ingredient.update({
      where: { id },
      data: { 
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    // Calcular estado para la respuesta
    const stockPercentage = restoredIngredient.currentStock / restoredIngredient.minStock
    let status = 'ok'
    let statusColor = 'green'
    let statusText = 'Stock OK'

    if (restoredIngredient.currentStock === 0) {
      status = 'empty'
      statusColor = 'gray'
      statusText = 'Agotado'
    } else if (stockPercentage <= 0.2) {
      status = 'critical'
      statusColor = 'red'
      statusText = 'Stock Crítico'
    } else if (stockPercentage <= 1) {
      status = 'low'
      statusColor = 'yellow'
      statusText = 'Stock Bajo'
    }

    return NextResponse.json({
      message: 'Ingrediente reactivado exitosamente',
      ingredient: {
        ...restoredIngredient,
        status,
        statusColor,
        statusText,
        stockPercentage: Math.round(stockPercentage * 100)
      }
    })
  } catch (error) {
    console.error('Error al reactivar ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}