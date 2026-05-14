import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/prisma"
import { OrderItemStatus } from '@/types'
import { emitOrderUpdate } from '@/lib/socket-events'
import { updateOrderSchema } from '@/lib/validations/order'



// GET /api/orders/[id] - Obtener pedido específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const order = await prisma.order.findUnique({
      where: { id },
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
                description: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        invoice: {
          select: {
            id: true,
            type: true,
            number: true,
            customerName: true,
            customerRuc: true,
            customerAddress: true,
            subtotal: true,
            igv: true,
            total: true,
            paymentMethod: true,
            amountPaid: true,
            change: true,
            status: true,
            issuedAt: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos: JEFE y MESERO pueden ver pedidos creados por cualquiera de los dos roles
    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json(
        { error: 'No autorizado para ver este pedido' },
        { status: 403 }
      )
    }

    // Verificar que el pedido fue creado por JEFE o MESERO
    const orderCreator = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { role: true }
    })

    if (!orderCreator || !['JEFE', 'MESERO'].includes(orderCreator.role)) {
      return NextResponse.json(
        { error: 'Este pedido no puede ser visualizado' },
        { status: 403 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error al obtener pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Actualizar pedido
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
    const validation = updateOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de actualización inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { notes, customerName, customerDni, items } = validation.data

    console.log("API PATCH validado:", { id, notes, customerName, customerDni, itemsCount: items?.length })

    // Obtener el pedido actual con items originales para detectar cambios
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos: JEFE y MESERO pueden modificar pedidos creados por cualquiera de los dos roles
    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json(
        { error: 'No autorizado para modificar este pedido' },
        { status: 403 }
      )
    }

    // Verificar que el pedido fue creado por JEFE o MESERO
    const orderCreator = await prisma.user.findUnique({
      where: { id: existingOrder.userId },
      select: { role: true }
    })

    if (!orderCreator || !['JEFE', 'MESERO'].includes(orderCreator.role)) {
      return NextResponse.json(
        { error: 'Este pedido no puede ser modificado' },
        { status: 403 }
      )
    }

    // Permitir edición en estados PENDING, CONFIRMED, PREPARING, READY y SERVED
    // Para pedidos COMPLETED, solo permitir actualizar datos del cliente (no items)
    // Solo bloquear completamente pedidos CANCELLED
    if (existingOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'No se pueden editar pedidos cancelados' },
        { status: 400 }
      )
    }

    // Si el pedido está COMPLETED, solo permitir actualizar datos del cliente
    if (existingOrder.status === 'COMPLETED' && items !== undefined) {
      return NextResponse.json(
        { error: 'No se pueden modificar items de pedidos completados' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    let newTotalAmount = Number(existingOrder.totalAmount)
    let products: Array<Record<string, unknown>> = []

    // Actualizar campos básicos
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (customerName !== undefined) {
      updateData.customerName = customerName
    }
    if (customerDni !== undefined) {
      updateData.customerDni = customerDni
    }

    // Si se proporcionan items, actualizar la lista de productos
    if (items && Array.isArray(items)) {
      // Separar items nuevos de existentes para validación
      const newItems = items.filter((item: { id?: string }) => !item.id || item.id.toString().startsWith('item_'))
      const existingItems = items.filter((item: { id?: string }) => item.id && !item.id.toString().startsWith('item_'))

      // Solo validar disponibilidad de productos para items NUEVOS
      const newProductIds = newItems
        .filter((item: { productId?: string }) => item.productId)
        .map((item: { productId: string }) => item.productId)
      const existingProductIds = existingItems
        .filter((item: { productId?: string }) => item.productId)
        .map((item: { productId: string }) => item.productId)

      // Obtener productos para items nuevos (deben estar disponibles)
      const newProducts = newProductIds.length > 0 ? await prisma.product.findMany({
        where: {
          id: { in: newProductIds },
          isActive: true,
          isAvailable: true
        }
      }) : []

      // Obtener productos para items existentes (pueden no estar disponibles)
      const existingProducts = existingProductIds.length > 0 ? await prisma.product.findMany({
        where: {
          id: { in: existingProductIds },
          isActive: true
        }
      }) : []

      // Solo validar disponibilidad para productos nuevos
      if (newProductIds.length > 0 && newProducts.length !== newProductIds.length) {
        return NextResponse.json(
          { error: 'Algunos productos no están disponibles' },
          { status: 400 }
        )
      }

      // Combinar todos los productos para el cálculo de totales
      products = [...newProducts, ...existingProducts]

      // Calcular nuevos totales
      newTotalAmount = 0
      items.forEach((item: { productId: string; quantity: number; notes?: string | null }) => {
        const product = products.find(p => (p as { id: string }).id === item.productId) as { id: string; price: unknown }
        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`)
        }

        const subtotal = Number(product.price) * item.quantity
        newTotalAmount += subtotal
      })

      updateData.totalAmount = newTotalAmount
    }

    // Realizar la actualización en una transacción
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Si hay nuevos items, manejar actualizaciones y creaciones
      if (items && Array.isArray(items) && products.length > 0) {
        console.log("Items recibidos para actualizar:", items)

        // Separar items existentes de nuevos
        const existingItems = items.filter((item): item is { id: string; productId: string; quantity: number; notes?: string | null } => 
          !!item.id && !item.id.toString().startsWith('item_')
        )
        const newItems = items.filter(item => !item.id || item.id.toString().startsWith('item_'))

        console.log("Items existentes:", existingItems)
        console.log("Items nuevos:", newItems)

        // Obtener IDs de items actuales en la base de datos con su estado
        const currentOrderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          select: { id: true, status: true }
        })

        // Obtener IDs de items que se van a mantener
        const keepItemIds = existingItems.map(item => item.id)

        // Solo eliminar items que NO están en la lista Y que NO están servidos
        // Los items servidos NUNCA se eliminan
        const itemsToDelete = currentOrderItems
          .filter(item => !keepItemIds.includes(item.id) && item.status !== 'SERVED')
          .map(item => item.id)

        if (itemsToDelete.length > 0) {
          console.log("Eliminando items (solo PENDING):", itemsToDelete)
          await tx.orderItem.deleteMany({
            where: {
              id: { in: itemsToDelete }
            }
          })
        }

        // Actualizar items existentes
        for (const item of existingItems) {
          const product = products.find((p) => (p as { id: string }).id === (item as { productId: string }).productId)
          if (!product) {
            console.warn(`Producto no encontrado para item ${(item as { id: string }).id}`)
            continue
          }

          const subtotal = Number((product as { price: unknown })!.price) * (item as { quantity: number }).quantity

          // Verificar que el item existe antes de actualizar
          const existingItem = await tx.orderItem.findUnique({
            where: { id: (item as { id: string }).id }
          })

          if (existingItem) {
            await tx.orderItem.update({
              where: { id: (item as { id: string }).id },
              data: {
                quantity: (item as { quantity: number }).quantity,
                unitPrice: Number((product as { price: unknown })!.price),
                subtotal: subtotal,
                notes: (item as { notes?: string | null }).notes || null
              }
            })
          } else {
            console.warn(`Item ${(item as { id: string }).id} no encontrado para actualizar`)
          }
        }

        // Crear items nuevos
        if (newItems.length > 0) {
          const newOrderItemsData = newItems.map((item: { productId: string; quantity: number; notes?: string | null }) => {
            const product = products.find((p) => (p as { id: string }).id === item.productId)
            const subtotal = Number((product as { price: unknown })!.price) * item.quantity

            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number((product as { price: unknown })!.price),
              subtotal: subtotal,
              notes: item.notes || null,
              orderId: id,
              status: 'PENDING' as OrderItemStatus // Los nuevos items siempre empiezan como PENDING
            }
          })

          await tx.orderItem.createMany({
            data: newOrderItemsData
          })

          // Si se agregaron nuevos items y el pedido estaba SERVED, cambiarlo a CONFIRMED
          // para que los nuevos items puedan ser preparados
          if (existingOrder.status === 'SERVED') {
            updateData.status = 'CONFIRMED'
          }
        }
      }

      // Actualizar el pedido
      const order = await tx.order.update({
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

      return order
    })

    // Detectar cambios e imprimir en cocina si es necesario
    if (items && Array.isArray(items)) {
      try {
        // Usar los items originales capturados antes de la transacción
        await printOrderChanges(id, existingOrder.orderItems, items)
      } catch (printError) {
        console.error('Error al imprimir cambios en cocina:', printError)
        // No interrumpir el flujo si falla la impresión
      }
    }

    // Emitir evento de Socket.IO para pedido actualizado
    emitOrderUpdate(updatedOrder)

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error al actualizar pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Función para detectar cambios en el pedido e imprimir en cocina
 */
async function printOrderChanges(
  orderId: string,
  originalItems: Array<{ id: string; productId: string; quantity: number; product: { name: string } }>,
  newItems: Array<{ id?: string; productId: string; quantity: number }>
) {
  try {
    // Separar items nuevos de existentes
    const newItemsOnly = newItems.filter((item: { id?: string }) => !item.id || item.id.toString().startsWith('item_'))
    const existingItemsOnly = newItems.filter((item: { id?: string }) => item.id && !item.id.toString().startsWith('item_'))

    // Obtener IDs de items que se van a mantener
    const keepItemIds = existingItemsOnly.map((item: { id?: string }) => item.id)

    // Detectar items eliminados (que estaban en original pero no en la nueva lista)
    const removedItems = originalItems
      .filter(originalItem => !keepItemIds.includes(originalItem.id))
      .map(item => ({
        productName: item.product.name,
        quantity: item.quantity
      }))

    // Preparar items agregados
    const addedItems = []
    if (newItemsOnly.length > 0) {
      // Obtener nombres de productos para items nuevos
      const productIds = newItemsOnly.map((item: { productId: string }) => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
      })

      for (const item of newItemsOnly) {
        const product = products.find(p => p.id === item.productId)
        if (product) {
          addedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            notes: (item as { notes?: string | null }).notes
          })
        }
      }
    }

    // Solo imprimir si hay cambios reales (eliminaciones SIEMPRE son significativas)
    if (addedItems.length > 0 || removedItems.length > 0) {
      console.log('Detectados cambios en pedido:', {
        orderId,
        addedItems: addedItems.length,
        removedItems: removedItems.length
      })

      // Obtener datos del pedido para el ticket
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: { select: { number: true } },
          user: { select: { name: true } }
        }
      })

      if (order) {
        // Obtener nombres de productos para items agregados
        const addedProductIds = addedItems.map(item => item.productId)
        const addedProducts = addedProductIds.length > 0 ? await prisma.product.findMany({
          where: { id: { in: addedProductIds } },
          select: { id: true, name: true }
        }) : []

        // Preparar datos para la impresión
        const printData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber: order.type === 'MESA' && order.table
            ? order.table.number.toString()
            : order.type,
          waiterName: order.user?.name || 'Sistema',
          addedItems: addedItems.map(item => {
            const product = addedProducts.find((p: { id: string; name: string }) => p.id === item.productId)
            return {
              productName: product?.name || 'Producto desconocido',
              quantity: item.quantity,
              notes: item.notes
            }
          }),
          removedItems: removedItems,
          timestamp: new Date()
        }

        // Intentar imprimir usando el servicio de configuración
        try {
          const { PrinterConfigService } = await import('@/lib/printer-config')
          const kitchenPrinter = await PrinterConfigService.getKitchenPrinter()

          if (kitchenPrinter) {
            // Generar contenido del ticket
            const ticketContent = generateChangesTicket(printData)
            console.log('Enviando cambios a impresora de cocina:', kitchenPrinter.name)
            console.log('Contenido del ticket:', ticketContent)

            // Aquí se podría integrar con el driver de impresión real
            // Por ahora solo logueamos el contenido
          } else {
            console.log('No hay impresora de cocina configurada')
          }
        } catch (printerError) {
          console.error('Error accediendo a impresora:', printerError)
        }
      }
    } else {
      console.log('No hay cambios significativos para imprimir en cocina')
    }

  } catch (error) {
    console.error('Error en printOrderChanges:', error)
    throw error
  }
}

/**
 * Función para generar el contenido del ticket de cambios
 */
function generateChangesTicket(data: {
  orderId: string
  orderNumber: string
  tableNumber: string
  waiterName: string
  addedItems: Array<{ productName: string; quantity: number; notes?: string | null }>
  removedItems: Array<{ productName: string; quantity: number }>
  timestamp: Date
}): string {
  const lines: string[] = []

  // Header
  lines.push('================================')
  lines.push('      CAMBIOS EN PEDIDO')
  lines.push('================================')
  lines.push('')
  lines.push(`Pedido: #${data.orderNumber}`)
  lines.push(`Mesa/Tipo: ${data.tableNumber}`)
  lines.push(`Mesero: ${data.waiterName}`)
  lines.push(`Hora: ${data.timestamp.toLocaleTimeString('es-PE')}`)
  lines.push('')
  lines.push('================================')

  // Items agregados
  if (data.addedItems.length > 0) {
    lines.push('')
    lines.push('PRODUCTOS AGREGADOS:')
    lines.push('--------------------------------')
    data.addedItems.forEach(item => {
      lines.push(`+ ${item.quantity}x ${item.productName}`)
      if (item.notes && item.notes.trim()) {
        lines.push(`  Notas: ${item.notes}`)
      }
    })
  }

  // Items eliminados
  if (data.removedItems.length > 0) {
    lines.push('')
    lines.push('PRODUCTOS ELIMINADOS:')
    lines.push('--------------------------------')
    data.removedItems.forEach(item => {
      lines.push(`- ${item.quantity}x ${item.productName}`)
    })
  }

  lines.push('')
  lines.push('================================')
  lines.push('     REVISAR CAMBIOS')
  lines.push('================================')
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

// DELETE /api/orders/[id] - Cancelar pedido
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

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

    // Verificar permisos: JEFE y MESERO pueden cancelar pedidos creados por cualquiera de los dos roles
    if (session.user.role !== 'JEFE' && session.user.role !== 'MESERO') {
      return NextResponse.json(
        { error: 'No autorizado para cancelar este pedido' },
        { status: 403 }
      )
    }

    // Verificar que el pedido fue creado por JEFE o MESERO
    const orderCreator = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { role: true }
    })

    if (!orderCreator || !['JEFE', 'MESERO'].includes(orderCreator.role)) {
      return NextResponse.json(
        { error: 'Este pedido no puede ser cancelado' },
        { status: 403 }
      )
    }

    // Solo permitir cancelación de pedidos que no estén completados o servidos
    if (['COMPLETED', 'SERVED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'No se puede cancelar un pedido completado o servido' },
        { status: 400 }
      )
    }

    // Cancelar el pedido y liberar la mesa si es necesario
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // Marcar pedido como cancelado
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        },
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
                  price: true
                }
              }
            }
          }
        }
      })

      // Liberar la mesa si no hay otros pedidos activos
      if (order.tableId) {
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

        if (activeOrdersInTable === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'DISPONIBLE' }
          })
        }
      }

      return updated
    })

    return NextResponse.json(cancelledOrder)
  } catch (error) {
    console.error('Error al cancelar pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
