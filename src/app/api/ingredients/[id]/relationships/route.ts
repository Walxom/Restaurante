import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"



// GET /api/ingredients/[id]/relationships - Obtener relaciones del ingrediente
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden ver las relaciones
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Obtener el ingrediente con sus relaciones
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    isAvailable: true,
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    // Separar productos activos e inactivos
    const activeProducts = ingredient.recipeIngredients
      .filter((ri: { quantity: number; unit: string; notes?: string | null; recipe: { product: { isActive: boolean; id: string; name: string; category?: { name: string } | null; isAvailable: boolean } } }) => ri.recipe.product.isActive)
      .map((ri: { quantity: number; unit: string; notes?: string | null; recipe: { product: { isActive: boolean; id: string; name: string; category?: { name: string } | null; isAvailable: boolean } } }) => ({
        id: ri.recipe.product.id,
        name: ri.recipe.product.name,
        category: ri.recipe.product.category?.name || 'Sin categoría',
        isAvailable: ri.recipe.product.isAvailable,
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes
      }))

    const inactiveProducts = ingredient.recipeIngredients
      .filter((ri: { quantity: number; unit: string; notes?: string | null; recipe: { product: { isActive: boolean; id: string; name: string; category?: { name: string } | null; isAvailable: boolean } } }) => !ri.recipe.product.isActive)
      .map((ri: { quantity: number; unit: string; notes?: string | null; recipe: { product: { isActive: boolean; id: string; name: string; category?: { name: string } | null; isAvailable: boolean } } }) => ({
        id: ri.recipe.product.id,
        name: ri.recipe.product.name,
        category: ri.recipe.product.category?.name || 'Sin categoría',
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes
      }))

    // Determinar el tipo de eliminación que se realizaría
    const deletionType = activeProducts.length > 0 ? 'soft_delete' : 'hard_delete'
    
    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock
      },
      relationships: {
        activeProducts,
        inactiveProducts,
        totalActiveProducts: activeProducts.length,
        totalInactiveProducts: inactiveProducts.length
      },
      deletionPreview: {
        type: deletionType,
        message: deletionType === 'hard_delete' 
          ? 'El ingrediente se eliminará completamente de la base de datos'
          : 'El ingrediente se moverá a la papelera',
        reason: deletionType === 'hard_delete'
          ? 'No está siendo usado en ningún producto activo del menú'
          : `Está siendo usado en ${activeProducts.length} producto(s) activo(s) del menú`
      }
    })
  } catch (error) {
    console.error('Error al obtener relaciones del ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}