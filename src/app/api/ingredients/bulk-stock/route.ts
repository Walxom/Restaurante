import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"

// PATCH /api/ingredients/bulk-stock - Ajustar stock de múltiples ingredientes
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { ingredientIds, action, quantity, reason } = body

    // Validaciones básicas
    if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json(
        { error: 'Se debe proporcionar al menos un ID de ingrediente' },
        { status: 400 }
      )
    }

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

    // Verificar que todos los ingredientes existen y están activos
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        isActive: true
      },
      include: {
        category: true
      }
    })

    if (ingredients.length !== ingredientIds.length) {
      const foundIds = ingredients.map((ing: { id: string }) => ing.id)
      const missingIds = ingredientIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Ingredientes no encontrados o inactivos: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Preparar las actualizaciones
    const updates: any[] = []
    const movements: any[] = []

    for (const ingredient of ingredients) {
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
          { error: `El stock de ${ingredient.name} no puede ser negativo` },
          { status: 400 }
        )
      }

      updates.push({
        id: ingredient.id,
        newStock,
        previousStock: ingredient.currentStock
      })

      movements.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        action,
        quantity: Number(quantity),
        previousStock: ingredient.currentStock,
        newStock,
        difference: movement,
        reason: reason || null,
        adjustedBy: session.user.name,
        adjustedAt: new Date().toISOString()
      })
    }

    // Ejecutar todas las actualizaciones en una transacción
    const updatedIngredients = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const results = []

      for (const update of updates) {
        const updatedIngredient = await tx.ingredient.update({
          where: { id: update.id },
          data: {
            currentStock: update.newStock,
            updatedAt: new Date()
          },
          include: {
            category: true
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

        results.push({
          ...updatedIngredient,
          status,
          statusColor,
          statusText,
          stockPercentage: Math.round(stockPercentage * 100)
        })
      }

      return results
    })

    // Log de los ajustes
    console.log(`Ajuste masivo de stock realizado por ${session.user.name}:`)
    movements.forEach(movement => {
      console.log(`  - ${movement.ingredientName}: ${movement.previousStock} → ${movement.newStock} (${movement.difference > 0 ? '+' : ''}${movement.difference})`)
    })
    console.log(`  - Razón: ${reason || 'No especificada'}`)

    return NextResponse.json({
      success: true,
      message: `Stock ajustado para ${updatedIngredients.length} ingredientes`,
      ingredients: updatedIngredients,
      movements,
      summary: {
        totalAdjusted: updatedIngredients.length,
        action,
        quantity: Number(quantity),
        reason: reason || null,
        adjustedBy: session.user.name,
        adjustedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error al ajustar stock masivo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
