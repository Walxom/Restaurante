import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as IngredientService from '@/services/ingredient.service'

// GET /api/ingredients - Obtener ingredientes con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    const filters: IngredientService.IngredientFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search'),
      stockFilter: searchParams.get('stockFilter'),
      categoryId: searchParams.get('categoryId'),
      minCost: searchParams.get('minCost') ? parseFloat(searchParams.get('minCost')!) : undefined,
      maxCost: searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined,
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    }

    const result = await IngredientService.findMany(filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al obtener ingredientes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/ingredients - Crear nuevo ingrediente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    
    // El servicio se encarga de la lógica de reactivación y validación de duplicados
    const ingredient = await IngredientService.create(body)
    
    return NextResponse.json(ingredient, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear ingrediente:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: error.message?.includes('Ya existe') ? 400 : 500 }
    )
  }
}
