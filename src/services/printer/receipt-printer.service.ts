/**
 * @service receipt-printer.service.ts
 * Servicio para impresión de boletas y facturas fiscales en impresora térmica.
 * Permite invocación en proceso (in-memory) sin bucle de red HTTP local.
 */

import { prisma } from '@/lib/prisma'

export interface ReceiptPrintRequest {
  orderId: string
  documentType?: 'BOLETA' | 'FACTURA'
  customerName?: string
  customerRuc?: string
  paymentMethod?: string
  amountPaid?: number
}

export interface ReceiptData {
  type: string
  number: string
  orderNumber: string
  issuedAt: string
  customerName: string
  customerRuc?: string
  paymentMethod: string
  items: {
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  igv: number
  total: number
  amountPaid: number
  change: number
  order: {
    table: {
      number: string
    }
  }
}

export interface PrintReceiptResult {
  success: boolean
  message?: string
  error?: string
  details?: string
  suggestion?: string
  statusCode?: number
  invoice?: {
    number: string
    type: string
    total: string
    customerName: string
    orderId: string
    orderNumber: string
  }
  printDetails?: {
    printedAt: string
    printerStatus: string
  }
}

/**
 * Verificar estado de la impresora fiscal
 */
export async function checkFiscalPrinterStatus(): Promise<{ isConnected: boolean; message: string }> {
  try {
    const { PrinterConfigService } = await import('@/services/printer/printer-config')
    const { getSystemConfig } = await import('@/services/system.service')

    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL')

    if (!fiscalPrinter) {
      return {
        isConnected: false,
        message: 'No se encontró configuración de impresora fiscal'
      }
    }

    if (fiscalPrinter.status !== 'ACTIVE') {
      return {
        isConnected: false,
        message: `Impresora fiscal está ${fiscalPrinter.status}`
      }
    }

    const port = fiscalPrinter.serialPort || fiscalPrinter.bluetoothAddress
    if (!port) {
      return {
        isConnected: false,
        message: 'Puerto no configurado para impresora fiscal'
      }
    }

    const systemConfig = await getSystemConfig()

    try {
      const { SerialPort } = await import('serialport')

      await new Promise<void>((resolve, reject) => {
        const testPrinter = new SerialPort({
          path: port,
          baudRate: 115200,
          autoOpen: false
        })

        const timeout = setTimeout(() => {
          testPrinter.close()
          reject(new Error('Timeout'))
        }, 3000)

        testPrinter.open((err?: Error | null) => {
          clearTimeout(timeout)
          if (err) {
            reject(err)
          } else {
            testPrinter.close(() => {
              resolve()
            })
          }
        })
      })

      return {
        isConnected: true,
        message: `Impresora fiscal operativa en ${port} (${systemConfig.companyName || 'Empresa'})`
      }
    } catch (testError) {
      return {
        isConnected: false,
        message: `Error conectando a ${port}: ${testError instanceof Error ? testError.message : 'Error desconocido'}`
      }
    }
  } catch (error) {
    return {
      isConnected: false,
      message: `Error verificando impresora fiscal: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }
}

/**
 * Generar número de comprobante secuencial
 */
export async function generateInvoiceNumber(type: 'BOLETA' | 'FACTURA'): Promise<string> {
  try {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { type },
      orderBy: { number: 'desc' }
    })

    let nextNumber = 1
    if (lastInvoice?.number) {
      const matches = lastInvoice.number.match(/\d+$/)
      if (matches) {
        nextNumber = parseInt(matches[0], 10) + 1
      }
    }

    const prefix = type === 'BOLETA' ? 'B001' : 'F001'
    const paddedNumber = nextNumber.toString().padStart(6, '0')

    return `${prefix}-${paddedNumber}`
  } catch {
    const prefix = type === 'BOLETA' ? 'B001' : 'F001'
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${timestamp}`
  }
}

/**
 * Enviar datos a impresora fiscal por puerto serie o Bluetooth
 */
async function sendToFiscalPrinter(port: string, data: string, timeout: number = 5000): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const { SerialPort } = await import('serialport')

      const printer = new SerialPort({
        path: port,
        baudRate: 115200,
        autoOpen: false
      })

      const timeoutId = setTimeout(() => {
        printer.close()
        reject(new Error(`Timeout al conectar con impresora fiscal en ${port}`))
      }, timeout)

      printer.open((openErr?: Error | null) => {
        if (openErr) {
          clearTimeout(timeoutId)
          reject(new Error(`Error abriendo puerto ${port}: ${openErr.message}`))
          return
        }

        printer.write(data, (writeErr?: Error | null) => {
          if (writeErr) {
            clearTimeout(timeoutId)
            printer.close()
            reject(new Error(`Error escribiendo a ${port}: ${writeErr.message}`))
            return
          }

          setTimeout(() => {
            clearTimeout(timeoutId)
            printer.close(() => {
              resolve()
            })
          }, 1000)
        })
      })
    } catch (error) {
      reject(new Error(`Error iniciando impresión fiscal: ${error instanceof Error ? error.message : 'Error desconocido'}`))
    }
  })
}

/**
 * Imprimir comprobante fiscal con comandos ESC/POS
 */
export async function printFiscalReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
  try {
    const { PrinterConfigService } = await import('@/services/printer/printer-config')
    const { ReceiptTemplates } = await import('@/services/printer/thermal-printer-commands')
    const { getSystemConfig } = await import('@/services/system.service')

    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL')

    if (!fiscalPrinter) {
      throw new Error('No se encontró configuración de impresora fiscal activa')
    }

    if (fiscalPrinter.connectionType !== 'BLUETOOTH' && fiscalPrinter.connectionType !== 'SERIAL') {
      throw new Error('Impresora fiscal debe ser BLUETOOTH o SERIAL')
    }

    const port = fiscalPrinter.serialPort || fiscalPrinter.bluetoothAddress
    if (!port) {
      throw new Error('Puerto o dirección Bluetooth no configurado para impresora fiscal')
    }

    const systemConfig = await getSystemConfig()

    let escPosCommands: string
    if (data.type === 'FACTURA') {
      escPosCommands = ReceiptTemplates.generateInvoice({
        companyName: systemConfig.companyName || 'Mr. Frit Restaurant',
        companyRuc: systemConfig.companyRuc || '20123456789',
        companyAddress: systemConfig.companyAddress || 'Av. Principal 123, Lima',
        companyPhone: systemConfig.companyPhone || '(01) 123-4567',
        invoiceNumber: data.number,
        orderNumber: data.orderNumber,
        date: new Date(data.issuedAt),
        customerName: data.customerName,
        customerRuc: data.customerRuc || '00000000000',
        table: data.order.table.number,
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: data.subtotal,
        tax: data.igv,
        total: data.total,
        notes: `Pago: ${data.paymentMethod} - Vuelto: ${systemConfig.currency || 'S/'} ${data.change.toFixed(2)}`
      })
    } else {
      escPosCommands = ReceiptTemplates.generateReceipt({
        companyName: systemConfig.companyName || 'Mr. Frit Restaurant',
        companyRuc: systemConfig.companyRuc || '20123456789',
        companyAddress: systemConfig.companyAddress || 'Av. Principal 123, Lima',
        companyPhone: systemConfig.companyPhone || '(01) 123-4567',
        orderNumber: data.orderNumber,
        date: new Date(data.issuedAt),
        customerName: data.customerName,
        table: data.order.table.number,
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: data.subtotal,
        igv: data.igv,
        total: data.total,
        notes: `Pago: ${data.paymentMethod} - Vuelto: ${systemConfig.currency || 'S/'} ${data.change.toFixed(2)}`
      })
    }

    await sendToFiscalPrinter(port, escPosCommands, fiscalPrinter.timeout || 5000)
    return { success: true }
  } catch (error) {
    console.error('Error en printFiscalReceipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de impresión'
    }
  }
}

/**
 * Lógica principal para emitir e imprimir un comprobante para una orden
 */
export async function printReceiptForOrder(body: ReceiptPrintRequest): Promise<PrintReceiptResult> {
  if (!body.orderId) {
    return {
      success: false,
      error: 'ID de orden requerido',
      statusCode: 400
    }
  }

  // Buscar la orden por ID interno o por orderNumber
  let order = await prisma.order.findUnique({
    where: { id: body.orderId },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      user: true,
      table: true,
      invoice: true
    }
  })

  if (!order) {
    const cleanOrderNumber = body.orderId.replace('#', '')
    order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        user: true,
        table: true,
        invoice: true
      }
    })
  }

  if (!order) {
    return {
      success: false,
      error: 'Orden no encontrada. Verifica el ID o número de pedido.',
      statusCode: 404
    }
  }

  const documentType = body.documentType || (body.customerRuc ? 'FACTURA' : 'BOLETA')

  const subtotal = Number(order.totalAmount) / 1.18
  const igv = Number(order.totalAmount) - subtotal
  const total = Number(order.totalAmount)
  const amountPaid = body.amountPaid || total
  const change = Math.max(0, amountPaid - total)

  // Verificar estado del servicio de impresión fiscal
  const serviceStatus = await checkFiscalPrinterStatus()

  if (!serviceStatus.isConnected) {
    return {
      success: false,
      error: 'Impresora fiscal no disponible',
      details: serviceStatus.message,
      suggestion: 'Usa la vista previa mientras se resuelve el problema',
      statusCode: 503
    }
  }

  // Generar número de comprobante si no existe
  let invoiceNumber = order.invoice?.number
  if (!invoiceNumber) {
    invoiceNumber = await generateInvoiceNumber(documentType)
  }

  const receiptData: ReceiptData = {
    type: documentType,
    number: invoiceNumber,
    orderNumber: order.orderNumber,
    issuedAt: new Date().toISOString(),
    customerName: body.customerName || order.customerName || 'Cliente General',
    customerRuc: documentType === 'FACTURA' ? (body.customerRuc || '00000000000') : undefined,
    paymentMethod: body.paymentMethod || 'EFECTIVO',
    items: order.orderItems.map((item) => ({
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.subtotal)
    })),
    subtotal,
    igv,
    total,
    amountPaid,
    change,
    order: {
      table: {
        number: String(order.table?.number || 'Para llevar')
      }
    }
  }

  const printResult = await printFiscalReceipt(receiptData)

  if (!printResult.success) {
    return {
      success: false,
      error: 'Error al imprimir comprobante',
      details: printResult.error,
      suggestion: 'Verifica la conexión de la impresora fiscal',
      statusCode: 500
    }
  }

  // Crear o actualizar la factura en base de datos si no existe
  if (!order.invoice) {
    await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        type: documentType,
        subtotal,
        igv,
        total,
        customerName: receiptData.customerName,
        customerRuc: receiptData.customerRuc,
        paymentMethod: body.paymentMethod || 'EFECTIVO',
        amountPaid: amountPaid,
        change: change,
        orderId: order.id,
        issuedAt: new Date(),
        issuedBy: order.userId,
        status: 'ISSUED'
      }
    })
  }

  return {
    success: true,
    message: `${documentType} impresa correctamente`,
    invoice: {
      number: invoiceNumber,
      type: documentType,
      total: total.toFixed(2),
      customerName: receiptData.customerName,
      orderId: order.id,
      orderNumber: order.orderNumber
    },
    printDetails: {
      printedAt: new Date().toISOString(),
      printerStatus: serviceStatus.message
    }
  }
}
