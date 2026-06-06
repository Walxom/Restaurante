/**
 * @service kitchen-printer.service.ts
 * Servicio especializado en la lógica de impresión para cocina.
 * Maneja la detección de cambios en pedidos y generación de tickets de comandos.
 */

import { prisma } from "@/lib/prisma"
import { PrinterConfigService } from "./printer-config"

export interface PrintChangeData {
  orderId: string
  orderNumber: string
  tableNumber: string
  waiterName: string
  addedItems: Array<{ productName: string; quantity: number; notes?: string | null }>
  removedItems: Array<{ productName: string; quantity: number }>
  timestamp: Date
}

/**
 * Detecta qué productos se han añadido o eliminado de un pedido
 * y envía una notificación a la impresora de cocina si hay cambios.
 */
export async function printOrderChanges(
  orderId: string,
  originalItems: any[],
  updatedItems: any[]
) {
  try {
    // 1. Separar items nuevos de existentes en el DTO
    const newItemsOnly = updatedItems.filter(item => !item.id || item.id.toString().startsWith('item_'))
    const keptItemsOnly = updatedItems.filter(item => item.id && !item.id.toString().startsWith('item_'))

    const keptIds = keptItemsOnly.map(i => i.id)

    // 2. Detectar items eliminados
    const removedItems = originalItems
      .filter(orig => !keptIds.includes(orig.id))
      .map(item => ({
        productName: item.product?.name || 'Producto',
        quantity: item.quantity
      }))

    // 3. Preparar items agregados
    const addedItems = []
    if (newItemsOnly.length > 0) {
      const productIds = newItemsOnly.map(i => i.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
      })

      for (const item of newItemsOnly) {
        const product = products.find((p: { id: string; name: string }) => p.id === item.productId)
        if (product) {
          addedItems.push({
            productName: product.name,
            quantity: item.quantity,
            notes: item.notes
          })
        }
      }
    }

    // 4. Solo imprimir si hay cambios significativos
    if (addedItems.length === 0 && removedItems.length === 0) {
      return
    }

    // 5. Obtener información del pedido para el ticket
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: { select: { number: true } },
        user: { select: { name: true } }
      }
    })

    if (!order) return

    const printData: PrintChangeData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.type === 'MESA' && order.table
        ? order.table.number.toString()
        : order.type,
      waiterName: order.user?.name || 'Sistema',
      addedItems,
      removedItems,
      timestamp: new Date()
    }

    // 6. Obtener impresora y generar ticket
    const kitchenPrinter = await PrinterConfigService.getKitchenPrinter()
    if (kitchenPrinter) {
      const ticketContent = generateChangesTicket(printData)
      console.log(`[PRINTER: ${kitchenPrinter.name}] Enviando ticket de cambios para Pedido #${order.orderNumber}`)
      console.log(ticketContent)
      
      // Aquí se integraría con el driver de impresión real en el futuro
    }

  } catch (error) {
    console.error('Error en kitchen-printer.service:', error)
  }
}

/**
 * Genera el formato de texto para el ticket de cambios en cocina.
 */
function generateChangesTicket(data: PrintChangeData): string {
  const lines: string[] = []
  const hr = '================================'
  const separator = '--------------------------------'

  lines.push(hr)
  lines.push('      CAMBIOS EN PEDIDO')
  lines.push(hr)
  lines.push(`Pedido: #${data.orderNumber}`)
  lines.push(`Mesa/Tipo: ${data.tableNumber}`)
  lines.push(`Mesero: ${data.waiterName}`)
  lines.push(`Hora: ${data.timestamp.toLocaleTimeString('es-PE')}`)
  lines.push(hr)

  if (data.addedItems.length > 0) {
    lines.push('')
    lines.push('PRODUCTOS AGREGADOS:')
    lines.push(separator)
    data.addedItems.forEach(item => {
      lines.push(`+ ${item.quantity}x ${item.productName}`)
      if (item.notes?.trim()) lines.push(`  Notas: ${item.notes}`)
    })
  }

  if (data.removedItems.length > 0) {
    lines.push('')
    lines.push('PRODUCTOS ELIMINADOS:')
    lines.push(separator)
    data.removedItems.forEach(item => {
      lines.push(`- ${item.quantity}x ${item.productName}`)
    })
  }

  lines.push('')
  lines.push(hr)
  lines.push('     REVISAR CAMBIOS')
  lines.push(hr)
  lines.push('\n\n\n')

  return lines.join('\n')
}
