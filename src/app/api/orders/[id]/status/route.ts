import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"
import { convertToBaseUnit } from '@/features/inventory/utils/units'
import { emitOrderStatusChange } from '@/lib/socket-events'
import { updateOrderStatusSchema } from '@/features/orders/validations/order'



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

// Función para deducir stock de ingredientes basado en recetas
async function deductStockForOrder(orderId: string, tx: any) {
  // Obtener los items del pedido con sus productos y recetas
  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
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

  const stockDeductions: { ingredientId: string; totalDeduction: number }[] = []

  // Calcular las deducciones totales por ingrediente
  for (const item of orderItems) {
    if (item.product.recipe) {
      const recipe = item.product.recipe
      const quantity = item.quantity

      for (const recipeIngredient of recipe.ingredients) {
        // Calcular la cantidad necesaria basada en las porciones de la receta
        const recipeQuantityNeeded = (recipeIngredient.quantity * quantity) / recipe.servings

        // Convertir la cantidad de la unidad de la receta a la unidad base del ingrediente
        const baseQuantityNeeded = convertToBaseUnit(
          recipeQuantityNeeded,
          recipeIngredient.unit,
          recipeIngredient.ingredient.unit
        )

        console.log(`Deducción calculada para ${recipeIngredient.ingredient.name}:`)
        console.log(`  - Cantidad en receta: ${recipeIngredient.quantity} ${recipeIngredient.unit}`)
        console.log(`  - Cantidad del pedido: ${quantity}`)
        console.log(`  - Porciones de la receta: ${recipe.servings}`)
        console.log(`  - Cantidad necesaria: ${recipeQuantityNeeded} ${recipeIngredient.unit}`)
        console.log(`  - Cantidad convertida: ${baseQuantityNeeded} ${recipeIngredient.ingredient.unit}`)

        // Buscar si ya tenemos una deducción para este ingrediente
        const existingDeduction = stockDeductions.find(
          d => d.ingredientId === recipeIngredient.ingredientId
        )

        if (existingDeduction) {
          existingDeduction.totalDeduction += baseQuantityNeeded
        } else {
          stockDeductions.push({
            ingredientId: recipeIngredient.ingredientId,
            totalDeduction: baseQuantityNeeded
          })
        }
      }
    }
  }

  // Verificar disponibilidad de stock antes de deducir
  for (const deduction of stockDeductions) {
    const ingredient = await tx.ingredient.findUnique({
      where: { id: deduction.ingredientId }
    })

    if (!ingredient) {
      throw new Error(`Ingrediente no encontrado: ${deduction.ingredientId}`)
    }

    if (ingredient.currentStock < deduction.totalDeduction) {
      throw new Error(
        `Stock insuficiente para ${ingredient.name}. ` +
        `Disponible: ${ingredient.currentStock} ${ingredient.unit}, ` +
        `Necesario: ${deduction.totalDeduction} ${ingredient.unit}`
      )
    }
  }

  // Realizar las deducciones
  for (const deduction of stockDeductions) {
    await tx.ingredient.update({
      where: { id: deduction.ingredientId },
      data: {
        currentStock: {
          decrement: deduction.totalDeduction
        },
        updatedAt: new Date()
      }
    })

    // Log del movimiento de stock
    const ingredient = await tx.ingredient.findUnique({
      where: { id: deduction.ingredientId },
      select: { name: true, unit: true }
    })

    console.log(
      `Stock deducido - ${ingredient?.name || 'Ingrediente desconocido'}: ` +
      `${deduction.totalDeduction} ${ingredient?.unit || 'unidad'} ` +
      `(Pedido: ${orderId})`
    )
  }

  return stockDeductions
}

// PATCH /api/orders/[id]/status - Cambiar estado del pedido
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Validar con Zod
    const validation = updateOrderStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Estado de pedido inválido', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status } = validation.data

    // Obtener el pedido actual
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos según el rol y el cambio de estado
    if (session.user.role === 'MESERO') {
      // Verificar que el pedido fue creado por JEFE o MESERO
      const orderCreator = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { role: true }
      })

      if (!orderCreator || !['JEFE', 'MESERO'].includes(orderCreator.role)) {
        return NextResponse.json(
          { error: 'Este pedido no puede ser modificado' },
          { status: 403 }
        )
      }

      // Meseros solo pueden cambiar a ciertos estados
      const meseroAllowedStatuses = ['PENDING', 'CONFIRMED', 'SERVED', 'COMPLETED', 'CANCELLED']
      if (!meseroAllowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Estado no permitido para meseros' },
          { status: 403 }
        )
      }
    } else if (session.user.role !== 'JEFE') {
      // Solo JEFE y MESERO pueden cambiar estados de pedidos
      return NextResponse.json(
        { error: 'No autorizado para modificar pedidos' },
        { status: 403 }
      )
    }

    // Validar transiciones de estado válidas
    const currentStatus = order.status
    const validTransitions: { [key: string]: string[] } = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['SERVED', 'CANCELLED'],
      'SERVED': ['COMPLETED'],
      'COMPLETED': [], // Estado final
      'CANCELLED': [] // Estado final
    }

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `No se puede cambiar de ${currentStatus} a ${status}` },
        { status: 400 }
      )
    }

    // Realizar el cambio de estado con lógica adicional
    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Si se está marcando como SERVED, también marcar todos los items como SERVED
      if (status === 'SERVED') {
        // Obtener todos los items del pedido que no estén ya servidos
        const pendingItems = await tx.orderItem.findMany({
          where: {
            orderId: id,
            status: 'PENDING'
          }
        })

        // Marcar cada item como servido y manejar el stock
        for (const item of pendingItems) {
          // Primero deducir el stock para este item
          try {
            await deductStockForItem(item.id, tx)
            console.log(`✅ Stock deducido para item ${item.id} al marcar pedido como servido`)
          } catch (error) {
            console.error(`❌ Error al deducir stock para item ${item.id}:`, error)
            // Continuar con otros items aunque uno falle
          }

          // Luego actualizar el estado del item
          await tx.orderItem.update({
            where: { id: item.id },
            data: { status: 'SERVED' }
          })
        }
      }

      // Preparar datos de actualización
      const updateData: any = {
        status,
        updatedAt: new Date()
      }

      // Si el pedido se está completando o cancelando, establecer la fecha de fin
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        updateData.endDate = new Date()
      }

      // Actualizar el estado del pedido
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          table: {
            select: {
              number: true,
              capacity: true
            }
          },
          user: {
            select: {
              name: true,
              username: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true,
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
      })

      // Lógica de cambio automático de estado de mesa
      if (order.tableId) {
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          // Verificar si hay otros pedidos activos en la mesa (excluyendo el actual)
          const activeOrdersInTable = await tx.order.count({
            where: {
              tableId: order.tableId,
              status: {
                notIn: ['CANCELLED', 'COMPLETED']
              },
              id: {
                not: id
              }
            }
          })

          // Si no hay otros pedidos activos, liberar la mesa
          if (activeOrdersInTable === 0) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: 'DISPONIBLE' }
            })
            console.log(`Mesa ${order.table?.number} liberada - no hay más pedidos activos`)
          } else {
            console.log(`Mesa ${order.table?.number} mantiene estado - ${activeOrdersInTable} pedidos activos restantes`)
          }
        } else if (status === 'SERVED') {
          // ESPERANDO → OCUPADA: Cuando los platos están servidos
          const currentTable = await tx.table.findUnique({
            where: { id: order.tableId }
          })

          if (currentTable?.status === 'ESPERANDO') {
            // Verificar si todos los pedidos de la mesa están servidos
            const allOrdersInTable = await tx.order.findMany({
              where: {
                tableId: order.tableId,
                status: {
                  notIn: ['CANCELLED', 'COMPLETED']
                }
              }
            })

            const allOrdersServed = allOrdersInTable.every((orderInTable: { id: string; status: string }) =>
              orderInTable.id === id ?
                status === 'SERVED' :
                orderInTable.status === 'SERVED'
            )

            if (allOrdersServed) {
              await tx.table.update({
                where: { id: order.tableId },
                data: { status: 'OCUPADA' }
              })
            }
          }
        }
      }

      return updated
    })

    // Log del cambio de estado
    console.log(`Pedido ${order.orderNumber} cambió de ${currentStatus} a ${status} por ${session.user.name}`)

    // Emitir evento de Socket.IO para cambio de estado
    emitOrderStatusChange(order.id, currentStatus, status, updatedOrder)

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error al cambiar estado del pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
