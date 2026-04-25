import { NextRequest, NextResponse } from 'next/server'
import { thermalPrintQueue } from '@/lib/server-thermal-printer'
import { ReceiptTemplates } from '@/lib/thermal-printer-commands'
import { prisma } from '@/lib/prisma'

// Usar la instancia global exportada
const printQueue = thermalPrintQueue

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, type, userId, userRole, isTest, testData } = body

    // Validar parámetros
    if (!orderId || !type || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: orderId, type, userId' },
        { status: 400 }
      )
    }

    if (!['BOLETA', 'FACTURA'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de documento inválido. Debe ser BOLETA o FACTURA' },
        { status: 400 }
      )
    }

    let order
    let systemConfig
    let requestingUser

    if (isTest && testData) {
      // Manejar impresión de prueba
      order = {
        id: orderId,
        orderNumber: testData.orderNumber,
        customerName: testData.customerName,
        totalAmount: testData.total,
        orderItems: testData.items.map((item: any) => ({
          product: {
            name: item.name
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total
        })),
        table: { number: testData.table },
        user: { name: 'Sistema BLE' },
        notes: testData.notes
      }
      
      // Configuración mínima para pruebas
      systemConfig = {
        businessName: 'Mr. Frit Restaurant',
        businessAddress: 'Dirección de Prueba',
        businessPhone: '123-456-7890',
        businessRuc: '12345678901'
      }
      
      requestingUser = {
        id: userId,
        name: 'Usuario BLE Test',
        role: userRole || 'JEFE'
      }
    } else {
      // Obtener datos de la orden real
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          table: true,
          user: true
        }
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        )
      }

      // Obtener configuración del sistema
      systemConfig = await prisma.systemConfig.findFirst()
      if (!systemConfig) {
        return NextResponse.json(
          { error: 'Configuración del sistema no encontrada' },
          { status: 500 }
        )
      }

      // Obtener información del usuario que solicita la impresión
      requestingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!requestingUser) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        )
      }
    }



    // Generar contenido del recibo
    const receiptData = generateReceiptContent(order, systemConfig, type)

    // Crear trabajo de impresión
    const printJob = await printQueue.addPrintJob({
      orderId: order.id,
      orderNumber: order.orderNumber,
      documentType: type,
      content: receiptData,
      requestedBy: {
        id: requestingUser.id,
        name: requestingUser.name,
        role: requestingUser.role
      },
      metadata: {
        customerName: order.customerName,
        table: order.table?.number,
        total: order.totalAmount,
        itemCount: order.orderItems.length
      }
    })

    // Registrar en logs del sistema
    console.log(`📄 Trabajo de impresión creado:`, {
      jobId: printJob.id,
      order: order.orderNumber,
      type: type,
      requestedBy: `${requestingUser.name} (${requestingUser.role})`,
      queuePosition: printQueue.getQueueLength()
    })

    return NextResponse.json({
      success: true,
      jobId: printJob.id,
      message: 'Trabajo de impresión agregado a la cola',
      queuePosition: printQueue.getQueueLength(),
      estimatedTime: printQueue.getEstimatedWaitTime()
    })

  } catch (error) {
    console.error('❌ Error en API de impresión térmica:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Obtener estado de un trabajo específico
      const job = printQueue.getJobStatus(jobId)
      if (!job) {
        return NextResponse.json(
          { error: 'Trabajo de impresión no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          error: job.error,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          metadata: job.metadata
        }
      })
    } else {
      // Obtener estado general de la cola
      const queueStatus = printQueue.getQueueStatus()
      return NextResponse.json({
        queue: {
          length: queueStatus.length,
          processing: queueStatus.processing,
          completed: queueStatus.completed,
          failed: queueStatus.failed,
          estimatedWaitTime: queueStatus.estimatedWaitTime,
          printerStatus: queueStatus.printerStatus
        },
        recentJobs: queueStatus.recentJobs.map(job => ({
          id: job.id,
          orderNumber: job.orderNumber,
          documentType: job.documentType,
          status: job.status,
          requestedBy: job.requestedBy,
          createdAt: job.createdAt,
          metadata: job.metadata
        }))
      })
    }

  } catch (error) {
    console.error('❌ Error al obtener estado de impresión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function generateReceiptContent(order: any, systemConfig: any, type: 'BOLETA' | 'FACTURA'): string {
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date()

  if (type === 'FACTURA') {
    // Calcular IGV (18%)
    const subtotal = order.totalAmount / 1.18
    const tax = order.totalAmount - subtotal

    return ReceiptTemplates.generateInvoice({
      companyName: systemConfig.companyName || systemConfig.businessName,
      companyRuc: systemConfig.companyRuc || systemConfig.businessRuc,
      companyAddress: systemConfig.companyAddress || systemConfig.businessAddress,
      companyPhone: systemConfig.companyPhone || systemConfig.businessPhone,
      invoiceNumber: `F001-${order.orderNumber.padStart(8, '0')}`,
      orderNumber: order.orderNumber,
      date: orderDate,
      customerName: order.customerName || 'Cliente',
      customerRuc: order.customerRuc || '11111111111',
      table: order.table ? (typeof order.table === 'string' ? order.table : `Mesa ${order.table.number}`) : 'Para llevar',
      items: order.orderItems.map((item: any) => ({
        name: item.product ? item.product.name : item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.subtotal || item.total
      })),
      subtotal: subtotal,
      tax: tax,
      total: order.totalAmount,
      notes: order.notes
    })
  } else {
    // Calcular IGV (18%) también para boleta
    const subtotal = order.totalAmount / 1.18
    const tax = order.totalAmount - subtotal
    
    return ReceiptTemplates.generateReceipt({
      companyName: systemConfig.companyName || systemConfig.businessName,
      companyRuc: systemConfig.companyRuc || systemConfig.businessRuc,
      companyAddress: systemConfig.companyAddress || systemConfig.businessAddress,
      companyPhone: systemConfig.companyPhone || systemConfig.businessPhone,
      orderNumber: order.orderNumber,
      date: orderDate,
      customerName: order.customerName,
      customerDni: order.customerDni,
      table: order.table ? (typeof order.table === 'string' ? order.table : `Mesa ${order.table.number}`) : 'Para llevar',
      items: order.orderItems.map((item: any) => ({
        name: item.product ? item.product.name : item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.subtotal || item.total
      })),
      subtotal: subtotal,
      igv: tax,
      total: order.totalAmount,
      notes: order.notes
    })
  }
}