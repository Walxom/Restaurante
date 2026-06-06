import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"



// PATCH /api/ingredients/[id]/stock - Ajustar stock del ingrediente
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ajustar stock
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden ajustar el stock' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const body = await request.json()
    const { action, quantity, reason } = body

    // Validaciones básicas
    if (!action || !['add', 'subtract', 'set'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción debe ser "add", "subtract" o "set"' },
        { status: 400 }
      )
    }

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser un número positivo' },
        { status: 400 }
      )
    }

    // Verificar que el ingrediente existe
    const ingredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    if (!ingredient.isActive) {
      return NextResponse.json(
        { error: 'No se puede ajustar stock de un ingrediente inactivo' },
        { status: 400 }
      )
    }

    // Calcular nuevo stock
    let newStock = ingredient.currentStock
    let movement = 0

    switch (action) {
      case 'add':
        newStock = ingredient.currentStock + Number(quantity)
        movement = Number(quantity)
        break
      case 'subtract':
        newStock = Math.max(0, ingredient.currentStock - Number(quantity))
        movement = -(Number(quantity))
        break
      case 'set':
        newStock = Number(quantity)
        movement = Number(quantity) - ingredient.currentStock
        break
    }

    // Validar que el nuevo stock no sea negativo
    if (newStock < 0) {
      return NextResponse.json(
        { error: 'El stock no puede ser negativo' },
        { status: 400 }
      )
    }

    // Actualizar el stock del ingrediente
    const updatedIngredient = await prisma.ingredient.update({
      where: { id },
      data: {
        currentStock: newStock,
        updatedAt: new Date()
      }
    })

    // Calcular estado para la respuesta
    const stockPercentage = updatedIngredient.currentStock / updatedIngredient.minStock
    let status = 'ok'
    let statusColor = 'green'
    let statusText = 'Stock OK'

    if (updatedIngredient.currentStock === 0) {
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

    // Log del ajuste
    console.log(`Stock ajustado para ${ingredient.name}: ${ingredient.currentStock} → ${newStock} (${movement > 0 ? '+' : ''}${movement}) por ${session.user.name}. Razón: ${reason || 'No especificada'}`)

    return NextResponse.json({
      ingredient: {
        ...updatedIngredient,
        status,
        statusColor,
        statusText,
        stockPercentage: Math.round(stockPercentage * 100)
      },
      movement: {
        action,
        quantity: Number(quantity),
        previousStock: ingredient.currentStock,
        newStock,
        difference: movement,
        reason: reason || null,
        adjustedBy: session.user.name,
        adjustedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error al ajustar stock:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET /api/ingredients/[id]/stock - Obtener historial de movimientos (futuro)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver historial
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden ver el historial de stock' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Verificar que el ingrediente existe
    const ingredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    // Por ahora, devolver información básica del ingrediente
    // En V2.0 se implementará el modelo StockMovement para historial completo
    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        minStock: ingredient.minStock,
        maxStock: ingredient.maxStock
      },
      message: 'Historial detallado de movimientos estará disponible en V2.0',
      basicInfo: {
        lastUpdated: ingredient.updatedAt,
        stockLevel: ingredient.currentStock >= ingredient.minStock ? 'adequate' : 'low'
      }
    })
  } catch (error) {
    console.error('Error al obtener historial de stock:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
