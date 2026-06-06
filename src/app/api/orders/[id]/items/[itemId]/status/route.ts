import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"
import { TableStatus } from '@/types'
import { convertToBaseUnit } from '@/features/inventory/utils/units'
import { emitOrderItemUpdate, emitTableStatusChange, emitOrderStatusChange } from '@/lib/socket-events'



// Función para deducir stock cuando un item se marca como servido
async function deductStockForItem(itemId: string, tx: any) {
  // Obtener el item con su producto y receta
  const orderItem = await tx.orderItem.findUnique({
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

  if (!orderItem || !orderItem.product.recipe) {
    console.log(`Item ${itemId} no tiene receta, no se descuenta stock`)
    return []
  }

  const recipe = orderItem.product.recipe
  const quantity = orderItem.quantity
  const stockDeductions: { ingredientId: string; deduction: number; ingredientName: string; unit: string }[] = []

  // Calcular las deducciones por ingrediente
  for (const recipeIngredient of recipe.ingredients) {
    // Calcular la cantidad necesaria basada en las porciones de la receta
    const recipeQuantityNeeded = (recipeIngredient.quantity * quantity) / recipe.servings
    
    // Convertir la cantidad de la unidad de la receta a la unidad base del ingrediente
    const baseQuantityNeeded = convertToBaseUnit(
      recipeQuantityNeeded,
      recipeIngredient.unit,
      recipeIngredient.ingredient.unit
    )

    console.log(`Deducción para ${recipeIngredient.ingredient.name}:`)
    console.log(`  - Cantidad en receta: ${recipeIngredient.quantity} ${recipeIngredient.unit}`)
    console.log(`  - Cantidad del item: ${quantity}`)
    console.log(`  - Porciones de la receta: ${recipe.servings}`)
    console.log(`  - Cantidad necesaria: ${recipeQuantityNeeded} ${recipeIngredient.unit}`)
    console.log(`  - Cantidad convertida: ${baseQuantityNeeded} ${recipeIngredient.ingredient.unit}`)

    // Verificar disponibilidad de stock
    const ingredient = await tx.ingredient.findUnique({
      where: { id: recipeIngredient.ingredientId }
    })

    if (!ingredient) {
      throw new Error(`Ingrediente no encontrado: ${recipeIngredient.ingredient.name}`)
    }

    if (ingredient.currentStock < baseQuantityNeeded) {
      throw new Error(
        `Stock insuficiente para ${ingredient.name}. ` +
        `Disponible: ${ingredient.currentStock} ${ingredient.unit}, ` +
        `Necesario: ${baseQuantityNeeded} ${ingredient.unit}`
      )
    }

    // Realizar la deducción
    await tx.ingredient.update({
      where: { id: recipeIngredient.ingredientId },
      data: {
        currentStock: {
          decrement: baseQuantityNeeded
        },
        updatedAt: new Date()
      }
    })

    stockDeductions.push({
      ingredientId: recipeIngredient.ingredientId,
      deduction: baseQuantityNeeded,
      ingredientName: ingredient.name,
      unit: ingredient.unit
    })

    console.log(
      `Stock deducido - ${ingredient.name}: ${baseQuantityNeeded} ${ingredient.unit} ` +
      `(Item: ${orderItem.product.name} x${quantity})`
    )
  }

  return stockDeductions
}

// Función para devolver stock cuando un item se desmarca como servido
async function returnStockForItem(itemId: string, tx: any) {
  // Obtener el item con su producto y receta
  const orderItem = await tx.orderItem.findUnique({
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

  if (!orderItem || !orderItem.product.recipe) {
    console.log(`Item ${itemId} no tiene receta, no se devuelve stock`)
    return []
  }

  const recipe = orderItem.product.recipe
  const quantity = orderItem.quantity
  const stockReturns: { ingredientId: string; returned: number; ingredientName: string; unit: string }[] = []

  // Calcular las devoluciones por ingrediente
  for (const recipeIngredient of recipe.ingredients) {
    // Calcular la cantidad a devolver basada en las porciones de la receta
    const recipeQuantityToReturn = (recipeIngredient.quantity * quantity) / recipe.servings
    
    // Convertir la cantidad de la unidad de la receta a la unidad base del ingrediente
    const baseQuantityToReturn = convertToBaseUnit(
      recipeQuantityToReturn,
      recipeIngredient.unit,
      recipeIngredient.ingredient.unit
    )

    console.log(`Devolución para ${recipeIngredient.ingredient.name}:`)
    console.log(`  - Cantidad a devolver: ${baseQuantityToReturn} ${recipeIngredient.ingredient.unit}`)

    // Realizar la devolución
    await tx.ingredient.update({
      where: { id: recipeIngredient.ingredientId },
      data: {
        currentStock: {
          increment: baseQuantityToReturn
        },
        updatedAt: new Date()
      }
    })

    stockReturns.push({
      ingredientId: recipeIngredient.ingredientId,
      returned: baseQuantityToReturn,
      ingredientName: recipeIngredient.ingredient.name,
      unit: recipeIngredient.ingredient.unit
    })

    console.log(
      `Stock devuelto - ${recipeIngredient.ingredient.name}: ${baseQuantityToReturn} ${recipeIngredient.ingredient.unit} ` +
      `(Item: ${orderItem.product.name} x${quantity})`
    )
  }

  return stockReturns
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id: orderId, itemId } = resolvedParams
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError)
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }
    const { status } = body

    // Validar que el estado sea válido
    const validStatuses = ['PENDING', 'SERVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Verificar que el item existe y pertenece al pedido
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId: orderId
      },
      include: {
        product: true, // Incluir información del producto para la combinación
        order: {
          include: {
            table: true,
            orderItems: true
          }
        }
      }
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Solo meseros y jefes pueden marcar como servido
    if (status === 'SERVED' && !['MESERO', 'JEFE'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Solo los meseros y jefes pueden marcar items como servidos' },
        { status: 403 }
      )
    }

    // Realizar el cambio de estado con manejo de stock en una transacción
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let updatedItem

      // Manejar el stock según el cambio de estado
      if (status === 'SERVED' && orderItem.status === 'PENDING') {
        // Marcar como servido: deducir stock
        try {
          await deductStockForItem(itemId, tx)
          console.log(`✅ Stock deducido para item ${orderItem.product.name} x${orderItem.quantity}`)
        } catch (error) {
          console.error(`❌ Error al deducir stock:`, error)
          throw new Error(`No se puede marcar como servido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      } else if (status === 'PENDING' && orderItem.status === 'SERVED') {
        // Desmarcar como servido: devolver stock
        try {
          await returnStockForItem(itemId, tx)
          console.log(`✅ Stock devuelto para item ${orderItem.product.name} x${orderItem.quantity}`)
        } catch (error) {
          console.error(`❌ Error al devolver stock:`, error)
          throw new Error(`No se puede desmarcar como servido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      }

      // Si se está marcando como SERVED, verificar si ya existe otro item del mismo producto servido
      if (status === 'SERVED') {
        // Buscar si ya existe otro item del mismo producto que esté servido
        const existingServedItem = await tx.orderItem.findFirst({
          where: {
            orderId: orderId,
            productId: orderItem.product.id,
            status: 'SERVED',
            id: { not: itemId } // Excluir el item actual
          }
        })

        if (existingServedItem) {
          // Si existe, combinar las cantidades en el item existente y eliminar el actual
          const newQuantity = existingServedItem.quantity + orderItem.quantity
          const newSubtotal = Number(existingServedItem.unitPrice) * newQuantity

          // Actualizar el item existente con la nueva cantidad
          updatedItem = await tx.orderItem.update({
            where: { id: existingServedItem.id },
            data: {
              quantity: newQuantity,
              subtotal: newSubtotal,
              // Combinar notas si existen
              notes: existingServedItem.notes && orderItem.notes 
                ? `${existingServedItem.notes}; ${orderItem.notes}`
                : existingServedItem.notes || orderItem.notes
            }
          })

          // Eliminar el item actual ya que se combinó con el existente
          await tx.orderItem.delete({
            where: { id: itemId }
          })
        } else {
          // Si no existe, simplemente actualizar el estado del item actual
          updatedItem = await tx.orderItem.update({
            where: { id: itemId },
            data: { status }
          })
        }
      } else {
        // Para otros estados, simplemente actualizar
        updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: { status }
        })
      }

      return updatedItem
    })

    // Actualizar estados de pedido y mesa según el cambio
    // Verificar el estado actual de todos los items del pedido (después de posibles combinaciones)
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: orderId }
    })

    // Verificar si todos los items restantes están servidos
    const allServed = allItems.every((item: { id: string; status: string; [key: string]: unknown }) => item.status === 'SERVED')

    // Actualizar el estado del pedido manteniendo la lógica correcta
    const newOrderStatus = allServed ? 'SERVED' : 'CONFIRMED'
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newOrderStatus }
    })

    // Emitir evento de cambio de estado del pedido si cambió
    if (orderItem.order.status !== newOrderStatus) {
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
      emitOrderStatusChange(orderId, orderItem.order.status, newOrderStatus, updatedOrder)
    }

    // Actualizar estado de la mesa según el estado de los pedidos
    if (orderItem.order.tableId) {
      const tableOrders = await prisma.order.findMany({
        where: {
          tableId: orderItem.order.tableId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        },
        include: {
          orderItems: true
        }
      })

      // Verificar si todos los items de todos los pedidos activos están servidos
      const allOrdersServed = tableOrders.every((order: { id: string; orderItems: { id: string; status: string; [key: string]: unknown }[]; [key: string]: unknown }) => {
        // Para el pedido actual, obtener el estado actualizado de los items
        if (order.id === orderId) {
          // Usar los items actualizados que obtuvimos anteriormente
          return allItems.every((item: { id: string; status: string; [key: string]: unknown }) => item.status === 'SERVED')
        }
        // Para otros pedidos, verificar que todos sus items estén servidos
        return order.orderItems.every((item: { id: string; status: string; [key: string]: unknown }) => item.status === 'SERVED')
      })

      // Determinar el nuevo estado de la mesa
      let newTableStatus: TableStatus = 'ESPERANDO' // Por defecto, si hay pedidos activos
      const currentTableStatus = orderItem.order.table?.status
      
      if (allOrdersServed) {
        // Si todos los items están servidos, la mesa está OCUPADA
        newTableStatus = 'OCUPADA'
      }

      // Actualizar el estado de la mesa solo si hay cambio
      if (currentTableStatus !== newTableStatus) {
        await prisma.table.update({
          where: { id: orderItem.order.tableId },
          data: { status: newTableStatus }
        })
        
        // Emitir evento de cambio de estado de mesa
        emitTableStatusChange(
          orderItem.order.tableId,
          currentTableStatus || 'ESPERANDO',
          newTableStatus,
          {
            number: orderItem.order.table?.number,
            capacity: orderItem.order.table?.capacity
          }
        )
      }
    }

    // Emitir evento Socket.IO para actualización de item en tiempo real
    emitOrderItemUpdate(orderId, itemId, 'updated', {
      id: result.id,
      status: result.status,
      productName: orderItem.product.name,
      quantity: result.quantity,
      orderId: orderId,
      orderNumber: orderItem.order.orderNumber
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al actualizar estado del item:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}