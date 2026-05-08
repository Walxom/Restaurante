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

  if (currentStock === 0) {
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

  return {
    status,
    statusColor,
    statusText,
    stockPercentage: Math.round(stockPercentage * 100)
  }
}

// GET /api/ingredients - Obtener ingredientes con paginación y filtros avanzados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Parámetros de filtrado
    const search = searchParams.get('search')
    const stockFilter = searchParams.get('stockFilter') // 'all', 'low', 'critical', 'ok', 'empty'
    const categoryId = searchParams.get('categoryId')
    const minCost = searchParams.get('minCost')
    const maxCost = searchParams.get('maxCost')
    const sortBy = searchParams.get('sortBy') || 'name' // 'name', 'currentStock', 'cost', 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'asc' // 'asc', 'desc'

    // Construir filtros WHERE
    const where: any = {
      isActive: true
    }
    
    if (search) {
      // Para SQLite, usamos contains sin mode para evitar errores
      where.name = { contains: search }
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    if (minCost || maxCost) {
      where.cost = {}
      if (minCost) where.cost.gte = parseFloat(minCost)
      if (maxCost) where.cost.lte = parseFloat(maxCost)
    }

    // Configurar ordenamiento
    const orderBy: any = {}
    if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else if (sortBy === 'currentStock') {
      orderBy.currentStock = sortOrder
    } else if (sortBy === 'cost') {
      orderBy.cost = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else {
      orderBy.name = 'asc' // fallback
    }

    // Obtener ingredientes con paginación
    const [ingredients, totalCount] = await Promise.all([
      prisma.ingredient.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.ingredient.count({ where })
    ])

    // Aplicar filtro de stock si es necesario (en memoria para mayor flexibilidad)
    let filteredIngredients = ingredients
    let filteredCount = totalCount

    if (stockFilter && stockFilter !== 'all') {
      filteredIngredients = ingredients.filter(ingredient => {
        const stockPercentage = ingredient.currentStock / ingredient.minStock
        
        switch (stockFilter) {
          case 'empty':
            return ingredient.currentStock === 0
          case 'critical':
            return ingredient.currentStock > 0 && stockPercentage <= 0.2
          case 'low':
            return stockPercentage > 0.2 && stockPercentage <= 1
          case 'ok':
            return stockPercentage > 1
          default:
            return true
        }
      })
      
      // Recalcular el conteo filtrado
      filteredCount = filteredIngredients.length
    }

    // Agregar información de estado a cada ingrediente
    const ingredientsWithStatus = filteredIngredients.map(ingredient => {
      const stockStatus = calculateStockStatus(ingredient.currentStock, ingredient.minStock)
      
      return {
        ...ingredient,
        ...stockStatus
      }
    })

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(filteredCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      ingredients: ingredientsWithStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: filteredCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Error al obtener ingredientes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/ingredients - Crear nuevo ingrediente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden crear ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, unit, unitCategory, currentStock, minStock, maxStock, cost, categoryId } = body

    // Validaciones básicas
    if (!name || !unit || currentStock === undefined || minStock === undefined) {
      return NextResponse.json(
        { error: 'Nombre, unidad, stock actual y stock mínimo son requeridos' },
        { status: 400 }
      )
    }

    if (currentStock < 0 || minStock < 0) {
      return NextResponse.json(
        { error: 'Los stocks no pueden ser negativos' },
        { status: 400 }
      )
    }

    if (maxStock !== undefined && maxStock < minStock) {
      return NextResponse.json(
        { error: 'El stock máximo no puede ser menor al stock mínimo' },
        { status: 400 }
      )
    }

    // Verificar que la categoría existe si se proporciona
    if (categoryId) {
      const categoryExists = await prisma.ingredientCategory.findFirst({
        where: {
          id: categoryId,
          isActive: true
        }
      })

      if (!categoryExists) {
        return NextResponse.json(
          { error: 'La categoría seleccionada no existe' },
          { status: 400 }
        )
      }
    }

    // Verificar si existe un ingrediente activo con el mismo nombre
    const activeIngredient = await prisma.ingredient.findFirst({
      where: {
        name: name,
        isActive: true
      }
    })

    if (activeIngredient) {
      return NextResponse.json(
        { error: 'Ya existe un ingrediente activo con ese nombre' },
        { status: 400 }
      )
    }

    // Verificar si existe un ingrediente inactivo con el mismo nombre
    const inactiveIngredient = await prisma.ingredient.findFirst({
      where: {
        name: name,
        isActive: false
      }
    })

    let ingredient

    if (inactiveIngredient) {
      // Reactivar el ingrediente existente con los nuevos datos
      ingredient = await prisma.ingredient.update({
        where: { id: inactiveIngredient.id },
        data: {
          unit: unit.trim(),
          unitCategory: unitCategory?.trim() || null,
          currentStock: Number(currentStock),
          minStock: Number(minStock),
          maxStock: maxStock ? Number(maxStock) : null,
          cost: cost ? Number(cost) : null,
          categoryId: categoryId || null,
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
    } else {
      // Crear un nuevo ingrediente
      ingredient = await prisma.ingredient.create({
        data: {
          name: name.trim(),
          unit: unit.trim(),
          unitCategory: unitCategory?.trim() || null,
          currentStock: Number(currentStock),
          minStock: Number(minStock),
          maxStock: maxStock ? Number(maxStock) : null,
          cost: cost ? Number(cost) : null,
          categoryId: categoryId || null,
          isActive: true
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
    }

    // Calcular estado para la respuesta
    const stockStatus = calculateStockStatus(ingredient.currentStock, ingredient.minStock)

    return NextResponse.json({
      ...ingredient,
      ...stockStatus
    }, { status: 201 })
  } catch (error) {
    console.error('Error al crear ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
