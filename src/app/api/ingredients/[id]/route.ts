import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as IngredientService from '@/services/ingredient.service'

// GET /api/ingredients/[id] - Obtener ingrediente específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await context.params
    const ingredient = await IngredientService.findById(id)

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingrediente no encontrado' }, { status: 404 })
    }

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error al obtener ingrediente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/ingredients/[id] - Actualizar ingrediente
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    
    const ingredient = await IngredientService.update(id, body)
    return NextResponse.json(ingredient)
  } catch (error: any) {
    console.error('Error al actualizar ingrediente:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 400 })
  }
}

// DELETE /api/ingredients/[id] - Eliminar ingrediente
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await context.params
    await IngredientService.remove(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar ingrediente:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 400 })
  }
}
