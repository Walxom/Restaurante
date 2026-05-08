import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para actualizar categorías
const updateCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es muy largo').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color debe ser un hex válido').optional(),
  isActive: z.boolean().optional(),
})

// GET - Obtener categoría específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const category = await prisma.ingredientCategory.findUnique({
      where: { id: resolvedParams.id },
      include: {
        ingredients: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            currentStock: true,
            minStock: true,
            unit: true
          }
        },
        _count: {
          select: {
            ingredients: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error obteniendo categoría:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar categoría
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Verificar que la categoría existe
    const existingCategory = await prisma.ingredientCategory.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const nameExists = await prisma.ingredientCategory.findUnique({
        where: { name: validatedData.name }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'Ya existe una categoría con ese nombre' },
          { status: 400 }
        )
      }
    }

    const updatedCategory = await prisma.ingredientCategory.update({
      where: { id: resolvedParams.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            ingredients: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error actualizando categoría:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar categoría (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    // Verificar que la categoría existe
    const existingCategory = await prisma.ingredientCategory.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            ingredients: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Verificar si tiene ingredientes activos
    if (existingCategory._count.ingredients > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar una categoría que tiene ingredientes asignados',
          ingredientsCount: existingCategory._count.ingredients
        },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.ingredientCategory.update({
      where: { id: resolvedParams.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Categoría eliminada exitosamente' })
  } catch (error) {
    console.error('Error eliminando categoría:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}