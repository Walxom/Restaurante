import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"

// GET /api/ingredients/deleted - Obtener ingredientes eliminados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver ingredientes eliminados
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      isActive: false
    }

    if (search) {
      where.name = {
        contains: search
      }
    }

    // Obtener ingredientes eliminados con paginación
    const [deletedIngredients, totalCount] = await Promise.all([
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
        orderBy: {
          updatedAt: 'desc' // Mostrar los más recientemente eliminados primero
        },
        skip,
        take: limit
      }),
      prisma.ingredient.count({ where })
    ])

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      ingredients: deletedIngredients,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Error al obtener ingredientes eliminados:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
