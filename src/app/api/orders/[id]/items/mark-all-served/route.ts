import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitOrderItemUpdate, emitOrderStatusChange } from "@/lib/socket-events"

// Función para convertir unidades a unidad base
function convertToBaseUnit(quantity: number, unit: string): number {
  const conversions: { [key: string]: number } = {
    'kg': 1,
    'g': 0.001,
    'l': 1,
    'ml': 0.001,
    'unidad': 1,
    'piezas': 1,
    'tazas': 0.25,
    'cucharadas': 0.015,
    'cucharaditas': 0.005
  }
  
  return quantity * (conversions[unit.toLowerCase()] || 1)
}

// Función para deducir stock de un item individual
async function deductStockForItem(itemId: string, tx: any) {
  const item = await tx.orderItem.findUnique({
    where: { id: itemId },
    include: {
      product: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!item?.product?.recipe) {
    console.log(`Item ${itemId} no tiene receta, saltando descuento de stock`)
    return
  }

  console.log(`Descontando stock para item: ${item.product.name} x${item.quantity}`)

  for (const recipeIngredient of item.product.recipe.ingredients) {
    const totalQuantityNeeded = recipeIngredient.quantity * item.quantity
    const quantityInBaseUnit = convertToBaseUnit(totalQuantityNeeded, recipeIngredient.unit)

    console.log(`  - ${recipeIngredient.ingredient.name}: ${totalQuantityNeeded} ${recipeIngredient.unit} (${quantityInBaseUnit} unidad base)`)

    // Verificar stock disponible
    const ingredient = await tx.ingredient.findUnique({
      where: { id: recipeIngredient.ingredientId }
    })

    if (!ingredient) {
      throw new Error(`Ingrediente ${recipeIngredient.ingredient.name} no encontrado`)
    }

    if (ingredient.currentStock < quantityInBaseUnit) {
      throw new Error(`Stock insuficiente de ${ingredient.name}. Disponible: ${ingredient.currentStock}, Necesario: ${quantityInBaseUnit}`)
    }

    // Actualizar stock
    await tx.ingredient.update({
      where: { id: recipeIngredient.ingredientId },
      data: {
        currentStock: {
          decrement: quantityInBaseUnit
        }
      }
    })

    console.log(`  ✅ Stock actualizado para ${ingredient.name}`)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo meseros y jefes pueden marcar items como servidos
    if (!['MESERO', 'JEFE'].includes(session.user.role)) {
      return NextResponse.json({ error: "Solo los meseros y jefes pueden marcar items como servidos" }, { status: 403 })
    }

    const orderId = params.id

    // Marcar todos los items pendientes como servidos en una transacción atómica
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Verificar que el pedido existe y obtener items pendientes dentro de la transacción
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            where: {
              status: 'PENDING' // Solo items pendientes
            }
          }
        }
      })

      if (!order) {
        throw new Error("Pedido no encontrado")
      }

      if (order.orderItems.length === 0) {
        throw new Error("No hay items pendientes para marcar como servidos")
      }

      // Verificar que el pedido no esté ya en estado SERVED o superior
      if (['SERVED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
        throw new Error(`El pedido ya está en estado ${order.status} y no se puede modificar`)
      }

      const updatedItems = []

      for (const item of order.orderItems) {
        // Deducir stock para este item
        try {
          await deductStockForItem(item.id, tx)
          console.log(`Stock deducido para item ${item.id}`)
        } catch (error) {
          console.error(`Error al deducir stock para item ${item.id}:`, error)
          throw new Error(`Error al deducir stock: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }

        // Marcar item como servido
        const updatedItem = await tx.orderItem.update({
          where: { id: item.id },
          data: { status: 'SERVED' }
        })

        updatedItems.push(updatedItem)
      }

      // Verificar si todos los items del pedido están ahora servidos
      const allItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const allServed = allItems.every((item: { id: string; status: string; [key: string]: unknown }) => item.status === 'SERVED')

      // Si todos los items están servidos, actualizar el estado del pedido
      if (allServed) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'SERVED' }
        })

        // Si el pedido está asociado a una mesa, verificar si se puede liberar
        if (order.tableId) {
          const allOrdersInTable = await tx.order.findMany({
            where: {
              tableId: order.tableId,
              status: {
                notIn: ['CANCELLED', 'COMPLETED']
              }
            }
          })

          // Si solo queda este pedido y está servido, liberar la mesa
          if (allOrdersInTable.length === 1 && allOrdersInTable[0].id === orderId) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: 'DISPONIBLE' }
            })
          }
        }
      }

      return {
        updatedItems,
        allServed,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        message: `${updatedItems.length} items marcados como servidos`
      }
    })

    console.log(`✅ Todos los items del pedido ${result.orderNumber} marcados como servidos`)

    // Si el estado del pedido cambió a SERVED, emitir evento de cambio de estado de pedido
    if (result.allServed && result.oldStatus !== 'SERVED') {
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: {
            select: {
              number: true,
              capacity: true
            }
          }
        }
      })
      emitOrderStatusChange(orderId, result.oldStatus, 'SERVED', updatedOrder)
    }

    // Emitir evento Socket.IO para cada item actualizado
    result.updatedItems.forEach((item: any) => {
      emitOrderItemUpdate(orderId, item.id, 'updated', {
        id: item.id,
        status: 'SERVED',
        productName: item.product?.name || 'Producto',
        quantity: item.quantity,
        orderId: orderId,
        orderNumber: result.orderNumber
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error al marcar todos los items como servidos:", error)
    
    // Determinar el código de estado HTTP apropiado
    let statusCode = 500
    if (error instanceof Error) {
      if (error.message.includes('no encontrado')) {
        statusCode = 404
      } else if (error.message.includes('No hay items pendientes') || error.message.includes('ya está en estado')) {
        statusCode = 400
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: statusCode }
    )
  }
}