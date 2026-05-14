import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"



// GET /api/ingredients/[id] - Obtener ingrediente específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params

    const ingredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    // Calcular estado
    const stockPercentage = ingredient.currentStock / ingredient.minStock
    let status = 'ok'
    let statusColor = 'green'
    let statusText = 'Stock OK'

    if (ingredient.currentStock === 0) {
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

    return NextResponse.json({
      ...ingredient,
      status,
      statusColor,
      statusText,
      stockPercentage: Math.round(stockPercentage * 100)
    })
  } catch (error) {
    console.error('Error al obtener ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/ingredients/[id] - Actualizar ingrediente
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden editar ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, unit, unitCategory, currentStock, minStock, maxStock, cost, categoryId, isActive } = body

    // Verificar que el ingrediente existe
    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!existingIngredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      // Verificar que no existe otro ingrediente con el mismo nombre
      const duplicateIngredient = await prisma.ingredient.findFirst({
        where: {
          name: name,
          isActive: true,
          id: { not: id }
        }
      })

      if (duplicateIngredient) {
        return NextResponse.json(
          { error: 'Ya existe otro ingrediente con ese nombre' },
          { status: 400 }
        )
      }

      updateData.name = name.trim()
    }

    if (unit !== undefined) {
      updateData.unit = unit.trim()
    }

    if (unitCategory !== undefined) {
      updateData.unitCategory = unitCategory?.trim() || null
    }

    if (currentStock !== undefined) {
      if (currentStock < 0) {
        return NextResponse.json(
          { error: 'El stock actual no puede ser negativo' },
          { status: 400 }
        )
      }
      updateData.currentStock = Number(currentStock)
    }

    if (minStock !== undefined) {
      if (minStock < 0) {
        return NextResponse.json(
          { error: 'El stock mínimo no puede ser negativo' },
          { status: 400 }
        )
      }
      updateData.minStock = Number(minStock)
    }

    if (maxStock !== undefined) {
      if (maxStock !== null && maxStock < (minStock || existingIngredient.minStock)) {
        return NextResponse.json(
          { error: 'El stock máximo no puede ser menor al stock mínimo' },
          { status: 400 }
        )
      }
      updateData.maxStock = maxStock ? Number(maxStock) : null
    }

    if (cost !== undefined) {
      updateData.cost = cost ? Number(cost) : null
    }

    if (categoryId !== undefined) {
      if (categoryId) {
        // Verificar que la categoría existe
        const categoryExists = await prisma.ingredientCategory.findUnique({
          where: { id: categoryId }
        })

        if (!categoryExists) {
          return NextResponse.json(
            { error: 'La categoría seleccionada no existe' },
            { status: 400 }
          )
        }

        updateData.categoryId = categoryId
      } else {
        updateData.categoryId = null
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    // Actualizar el ingrediente
    const updatedIngredient = await prisma.ingredient.update({
      where: { id },
      data: updateData
    })

    // Calcular estado para la respuesta
    const stockPercentage = updatedIngredient.currentStock / updatedIngredient.minStock
    let status = 'ok'
    let statusColor = 'green'
    let statusText = 'Stock OK'

    if (updatedIngredient.currentStock === 0) {
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

    return NextResponse.json({
      ...updatedIngredient,
      status,
      statusColor,
      statusText,
      stockPercentage: Math.round(stockPercentage * 100)
    })
  } catch (error) {
    console.error('Error al actualizar ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/ingredients/[id] - Eliminar ingrediente (inteligente: completo o soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo jefes pueden eliminar ingredientes
    if (session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo los jefes pueden gestionar el inventario' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Verificar que el ingrediente existe
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
                    isActive: true
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

    if (!ingredient.isActive) {
      return NextResponse.json(
        { error: 'El ingrediente ya está eliminado' },
        { status: 400 }
      )
    }

    // Separar productos activos e inactivos
    const activeProducts = ingredient.recipeIngredients.filter(
      ri => ri.recipe.product.isActive
    )
    const inactiveProducts = ingredient.recipeIngredients.filter(
      ri => !ri.recipe.product.isActive
    )

    // Si el ingrediente está en uso en productos activos, NO permitir eliminación
    if (activeProducts.length > 0) {
      const activeProductNames = activeProducts.map(ri => ri.recipe.product.name).join(', ')
      
      return NextResponse.json({
        error: 'No se puede eliminar el ingrediente',
        message: `Este ingrediente está siendo usado en los siguientes productos activos del menú: ${activeProductNames}`,
        details: 'Para eliminar este ingrediente, primero debe removerlo de todos los productos del menú donde se está utilizando.',
        type: 'in_use_error',
        relatedProducts: activeProducts.map(ri => ({
          id: ri.recipe.product.id,
          name: ri.recipe.product.name,
          isActive: ri.recipe.product.isActive
        }))
      }, { status: 400 })
    }

    // Si solo tiene relaciones con productos inactivos, permitir soft delete
    if (inactiveProducts.length > 0) {
      await prisma.ingredient.update({
        where: { id },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      })

      const inactiveProductNames = inactiveProducts.map(ri => ri.recipe.product.name).join(', ')

      return NextResponse.json({
        message: 'Ingrediente movido a la papelera',
        type: 'soft_delete',
        reason: `El ingrediente estaba relacionado con productos inactivos: ${inactiveProductNames}`,
        relatedProducts: inactiveProducts.map(ri => ({
          id: ri.recipe.product.id,
          name: ri.recipe.product.name,
          isActive: ri.recipe.product.isActive
        }))
      })
    } else {
      // El ingrediente no tiene relaciones - intentar eliminación completa
      try {
        await prisma.ingredient.delete({
          where: { id }
        })

        return NextResponse.json({
          message: 'Ingrediente eliminado completamente de la base de datos',
          type: 'hard_delete',
          reason: 'El ingrediente no está siendo usado en ningún producto del menú'
        })
      } catch (deleteError) {
        // Si falla la eliminación completa, hacer soft delete como respaldo
        console.warn('No se pudo eliminar completamente, haciendo soft delete:', deleteError)
        
        await prisma.ingredient.update({
          where: { id },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          message: 'Ingrediente movido a la papelera',
          type: 'soft_delete',
          reason: 'No se pudo eliminar completamente debido a restricciones de la base de datos'
        })
      }
    }
  } catch (error) {
    console.error('Error al eliminar ingrediente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
