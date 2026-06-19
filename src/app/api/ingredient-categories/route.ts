import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as IngredientCategoryService from '@/services/ingredient-category.service'
import { ingredientCategorySchema } from '@/features/inventory/validations/ingredient'

// GET - Obtener todas las categorías
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const categories = await IngredientCategoryService.findAll(includeInactive)
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error obteniendo categorías:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validation = ingredientCategorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const category = await IngredientCategoryService.create(validation.data)
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creando categoría:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: error.message?.includes('Ya existe') ? 400 : 500 }
    )
  }
}