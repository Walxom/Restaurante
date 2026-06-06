import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"

// DELETE /api/ingredients/bulk-delete - Eliminar múltiples ingredientes
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden eliminar ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden eliminar ingredientes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ingredientIds } = body

    // Validaciones básicas
    if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json(
        { error: 'Se debe proporcionar al menos un ID de ingrediente' },
        { status: 400 }
      )
    }

    // Verificar que todos los ingredientes existen
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds }
      },
      include: {
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (ingredients.length !== ingredientIds.length) {
      const foundIds = ingredients.map((ing: { id: string }) => ing.id)
      const missingIds = ingredientIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Ingredientes no encontrados: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Verificar si algún ingrediente está siendo usado en recetas
    const ingredientsInUse = ingredients.filter((ingredient: { recipeIngredients: { length: number } }) => 
      ingredient.recipeIngredients.length > 0
    )

    if (ingredientsInUse.length > 0) {
      const inUseDetails = ingredientsInUse.map((ingredient: { name: string; recipeIngredients: Array<{ recipe: { product?: { name: string } | null } }> }) => ({
        name: ingredient.name,
        products: ingredient.recipeIngredients.map((ri: { recipe: { product?: { name: string } | null } }) => ri.recipe.product?.name).filter(Boolean)
      }))

      return NextResponse.json({
        error: 'Algunos ingredientes están siendo usados en recetas',
        ingredientsInUse: inUseDetails,
        message: 'No se pueden eliminar ingredientes que están siendo usados en recetas activas'
      }, { status: 400 })
    }

    // Ejecutar eliminación en transacción
    const deletedIngredients = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const results = []

      for (const ingredient of ingredients) {
        const deleted = await tx.ingredient.delete({
          where: { id: ingredient.id }
        })
        results.push(deleted)
      }

      return results
    })

    // Log de las eliminaciones
    console.log(`Eliminación masiva de ingredientes realizada por ${session.user.name}:`)
    deletedIngredients.forEach((ingredient: { name: string; id: string }) => {
      console.log(`  - Eliminado: ${ingredient.name} (ID: ${ingredient.id})`)
    })

    return NextResponse.json({
      success: true,
      message: `${deletedIngredients.length} ingredientes eliminados correctamente`,
      deletedIngredients: deletedIngredients.map((ingredient: { id: string; name: string }) => ({
        id: ingredient.id,
        name: ingredient.name,
        deletedAt: new Date().toISOString(),
        deletedBy: session.user.name
      })),
      summary: {
        totalDeleted: deletedIngredients.length,
        deletedBy: session.user.name,
        deletedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error al eliminar ingredientes masivamente:', error)

    // Manejar errores específicos de Prisma
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({
        error: 'No se pueden eliminar ingredientes que están siendo referenciados',
        message: 'Algunos ingredientes están siendo usados en otras partes del sistema'
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
