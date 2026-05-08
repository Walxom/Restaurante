import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Función helper para calcular estado del stock
function calculateStockStatus(currentStock: number, minStock: number) {
  const stockPercentage = currentStock / minStock
  let status = 'ok'
  let statusColor = 'green'
  let statusText = 'Stock OK'
  let priority = 0

  if (currentStock === 0) {
    status = 'empty'
    statusColor = 'gray'
    statusText = 'Agotado'
    priority = 4 // Máxima prioridad
  } else if (stockPercentage <= 0.2) {
    status = 'critical'
    statusColor = 'red'
    statusText = 'Stock Crítico'
    priority = 3
  } else if (stockPercentage <= 1) {
    status = 'low'
    statusColor = 'yellow'
    statusText = 'Stock Bajo'
    priority = 2
  } else {
    priority = 1
  }

  return {
    status,
    statusColor,
    statusText,
    stockPercentage: Math.round(stockPercentage * 100),
    priority
  }
}

// GET /api/inventory-alerts - Obtener alertas de inventario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver alertas
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Verificar si solo se solicitan estadísticas
    const statsOnly = searchParams.get('statsOnly') === 'true'
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Parámetros de filtrado
    const alertType = searchParams.get('alertType') || 'all' // 'all', 'empty', 'critical', 'low'
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'priority' // 'priority', 'name', 'stockPercentage'
    const sortOrder = searchParams.get('sortOrder') || 'desc' // 'asc', 'desc'

    // Construir filtros WHERE para estadísticas (sin filtros de búsqueda)
    const whereForStats: any = {
      isActive: true
    }
    
    // Construir filtros WHERE para alertas (con filtros si no es statsOnly)
    const where: any = {
      isActive: true
    }
    
    if (!statsOnly && search) {
        where.name = { contains: search }
      }

    if (!statsOnly && categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    // Obtener ingredientes para estadísticas (sin filtros)
    const allIngredients = await prisma.ingredient.findMany({
      where: whereForStats,
      select: {
        id: true,
        currentStock: true,
        minStock: true
      }
    })

    // Calcular estadísticas de alertas (sin filtros)
    const allIngredientsWithStatus = allIngredients.map(ingredient => {
      const stockStatus = calculateStockStatus(ingredient.currentStock, ingredient.minStock)
      return {
        ...ingredient,
        ...stockStatus
      }
    }).filter(ingredient => 
      ingredient.status === 'empty' || ingredient.status === 'critical' || ingredient.status === 'low'
    )

    const alertStats = {
      total: allIngredientsWithStatus.length,
      empty: allIngredientsWithStatus.filter(i => i.status === 'empty').length,
      critical: allIngredientsWithStatus.filter(i => i.status === 'critical').length,
      low: allIngredientsWithStatus.filter(i => i.status === 'low').length
    }

    // Si solo se solicitan estadísticas, devolverlas inmediatamente
    if (statsOnly) {
      return NextResponse.json({
        stats: alertStats
      })
    }

    // Obtener ingredientes para alertas (con filtros)
    const ingredients = await prisma.ingredient.findMany({
      where,
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

    // Filtrar ingredientes que tienen alertas y calcular estado
    const ingredientsWithAlerts = ingredients
      .map(ingredient => {
        const stockStatus = calculateStockStatus(ingredient.currentStock, ingredient.minStock)
        return {
          ...ingredient,
          ...stockStatus
        }
      })
      .filter(ingredient => {
        // Solo incluir ingredientes con alertas
        if (alertType === 'all') {
          return ingredient.status === 'empty' || ingredient.status === 'critical' || ingredient.status === 'low'
        } else {
          return ingredient.status === alertType
        }
      })

    // Ordenar según criterio
    ingredientsWithAlerts.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'priority') {
        comparison = b.priority - a.priority // Prioridad descendente por defecto
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'stockPercentage') {
        comparison = a.stockPercentage - b.stockPercentage
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Aplicar paginación
    const totalItems = ingredientsWithAlerts.length
    const paginatedAlerts = ingredientsWithAlerts.slice(skip, skip + limit)

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(totalItems / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      alerts: paginatedAlerts,
      stats: alertStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Error al obtener alertas de inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/inventory-alerts/bulk-resolve - Resolver múltiples alertas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden resolver alertas
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ingredientIds, newStock } = body

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de IDs de ingredientes' },
        { status: 400 }
      )
    }

    if (newStock === undefined || newStock < 0) {
      return NextResponse.json(
        { error: 'El nuevo stock debe ser un número positivo' },
        { status: 400 }
      )
    }

    // Actualizar stock de múltiples ingredientes
    const updatedIngredients = await prisma.ingredient.updateMany({
      where: {
        id: { in: ingredientIds },
        isActive: true
      },
      data: {
        currentStock: Number(newStock)
      }
    })

    return NextResponse.json({
      message: `Se actualizó el stock de ${updatedIngredients.count} ingredientes`,
      updatedCount: updatedIngredients.count
    })
  } catch (error) {
    console.error('Error al resolver alertas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}