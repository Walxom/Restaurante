import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/ingredients/stats - Obtener estadísticas del inventario
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver estadísticas
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden ver estadísticas del inventario' },
        { status: 403 }
      )
    }

    // Obtener todos los ingredientes activos
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true,
        maxStock: true,
        cost: true,
        unit: true
      }
    })

    if (ingredients.length === 0) {
      return NextResponse.json({
        totalIngredients: 0,
        stockOk: 0,
        stockLow: 0,
        stockCritical: 0,
        stockEmpty: 0,
        alerts: [],
        totalValue: 0,
        averageStockLevel: 0
      })
    }

    // Calcular estadísticas
    let stockOk = 0
    let stockLow = 0
    let stockCritical = 0
    let stockEmpty = 0
    let totalValue = 0
    const alerts: Array<Record<string, unknown>> = []

    ingredients.forEach(ingredient => {
      const stockPercentage = ingredient.currentStock / ingredient.minStock

      // Clasificar por estado
      if (ingredient.currentStock === 0) {
        stockEmpty++
        alerts.push({
          id: ingredient.id,
          name: ingredient.name,
          type: 'empty',
          message: `${ingredient.name} está agotado`,
          priority: 'high',
          currentStock: ingredient.currentStock,
          unit: ingredient.unit
        })
      } else if (stockPercentage <= 0.2) {
        stockCritical++
        alerts.push({
          id: ingredient.id,
          name: ingredient.name,
          type: 'critical',
          message: `${ingredient.name} en stock crítico (${ingredient.currentStock} ${ingredient.unit})`,
          priority: 'high',
          currentStock: ingredient.currentStock,
          minStock: ingredient.minStock,
          unit: ingredient.unit
        })
      } else if (stockPercentage <= 1) {
        stockLow++
        alerts.push({
          id: ingredient.id,
          name: ingredient.name,
          type: 'low',
          message: `${ingredient.name} en stock bajo (${ingredient.currentStock} ${ingredient.unit})`,
          priority: 'medium',
          currentStock: ingredient.currentStock,
          minStock: ingredient.minStock,
          unit: ingredient.unit
        })
      } else {
        stockOk++
      }

      // Calcular valor total (si tiene costo)
      if (ingredient.cost) {
        totalValue += ingredient.currentStock * ingredient.cost
      }
    })

    // Calcular nivel promedio de stock
    const averageStockLevel = ingredients.reduce((acc, ingredient) => {
      return acc + (ingredient.currentStock / ingredient.minStock)
    }, 0) / ingredients.length

    // Ordenar alertas por prioridad
    alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
    })

    return NextResponse.json({
      totalIngredients: ingredients.length,
      stockOk,
      stockLow,
      stockCritical,
      stockEmpty,
      alerts: alerts.slice(0, 10), // Solo los primeros 10 para el dashboard
      totalAlerts: alerts.length,
      totalValue: Math.round(totalValue * 100) / 100, // Redondear a 2 decimales
      averageStockLevel: Math.round(averageStockLevel * 100) / 100,
      summary: {
        healthy: stockOk,
        needsAttention: stockLow + stockCritical + stockEmpty,
        healthPercentage: Math.round((stockOk / ingredients.length) * 100)
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas de inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
