import { NextRequest, NextResponse } from 'next/server'
import { thermalPrintQueue } from '@/services/printer/server-thermal-printer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formatType, testData, userId } = body

    // Validar parámetros
    if (!formatType || !testData || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: formatType, testData, userId' },
        { status: 400 }
      )
    }

    if (!['BOLETA', 'FACTURA', 'COCINA'].includes(formatType)) {
      return NextResponse.json(
        { error: 'Tipo de formato inválido. Debe ser BOLETA, FACTURA o COCINA' },
        { status: 400 }
      )
    }

    // Generar contenido según el tipo de formato
    let content = ''
    let documentType = formatType
    let orderNumber = testData.orderNumber || 'TEST-' + Date.now()

    switch (formatType) {
      case 'BOLETA':
        content = generateBoletaTestContent(testData)
        break
      case 'FACTURA':
        content = generateFacturaTestContent(testData)
        break
      case 'COCINA':
        content = generateCocinaTestContent(testData)
        documentType = 'TICKET_COCINA'
        break
    }

    // Crear trabajo de impresión de prueba
    const printJob = await thermalPrintQueue.addPrintJob({
      orderId: 'test-' + Date.now(),
      orderNumber: orderNumber,
      documentType: documentType,
      content: content,
      requestedBy: {
        id: userId,
        name: 'Usuario de Prueba',
        role: 'JEFE'
      },
      metadata: {
        customerName: testData.customerName || 'Cliente de Prueba',
        table: testData.tableNumber,
        total: testData.total || 0,
        itemCount: testData.items?.length || 0
      }
    })

    console.log(`🧪 Trabajo de impresión de prueba creado:`, {
      jobId: printJob.id,
      formatType: formatType,
      orderNumber: orderNumber,
      queuePosition: thermalPrintQueue.getQueueLength()
    })

    return NextResponse.json({
      success: true,
      jobId: printJob.id,
      message: `Trabajo de impresión de ${formatType} agregado a la cola`,
      queuePosition: thermalPrintQueue.getQueueLength(),
      estimatedTime: thermalPrintQueue.getEstimatedWaitTime()
    })

  } catch (error) {
    console.error('❌ Error en API de prueba de impresión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function generateBoletaTestContent(testData: any): string {
  const now = new Date()
  const items = testData.items || []
  const subtotal = testData.subtotal || 0
  const igv = testData.igv || 0
  const total = testData.total || 0

  return `
\x1B\x40
\x1B\x61\x01\x1B\x45\x01\x1B\x21\x30
${testData.companyName || 'RESTAURANTE MR FRIT'}
\x1B\x21\x00\x1B\x45\x00

\x1B\x61\x01
RUC: ${testData.companyRuc || '20123456789'}
${testData.companyAddress || 'Av. Principal 123, Lima'}
Tel: ${testData.companyPhone || '(01) 234-5678'}

\x1B\x61\x01\x1B\x45\x01
BOLETA DE VENTA ELECTRONICA
${testData.number || 'B001-00000001'}
\x1B\x45\x00

\x1B\x61\x00
Fecha: ${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}
Cliente: ${testData.customerName || 'Cliente de Prueba'}
Mesa: ${testData.tableNumber || 'N/A'}
Mesero: ${testData.waiterName || 'Mesero Test'}

--------------------------------
DESCRIPCION    CANT   PRECIO TOTAL
--------------------------------
${items.map((item: any) => 
  `${item.description?.substring(0, 14).padEnd(14)} ${item.quantity.toString().padStart(3)} ${item.price?.toFixed(2).padStart(7)} ${item.total?.toFixed(2).padStart(6)}`
).join('\n')}
--------------------------------

\x1B\x61\x02
Subtotal:           S/ ${subtotal.toFixed(2)}
IGV:                 S/ ${igv.toFixed(2)}
\x1B\x45\x01
TOTAL:              S/ ${total.toFixed(2)}
\x1B\x45\x00

Pago: ${testData.paymentMethod || 'EFECTIVO'}
Recibido:           S/ ${testData.amountPaid?.toFixed(2) || total.toFixed(2)}
Vuelto:             S/ ${testData.change?.toFixed(2) || '0.00'}

\x1B\x61\x01
Gracias por su preferencia!
Vuelva pronto

\x1B\x61\x00
\x1B\x64\x05
\x1D\x56\x42\x00
`
}

function generateFacturaTestContent(testData: any): string {
  const now = new Date()
  const items = testData.items || []
  const subtotal = testData.subtotal || 0
  const igv = testData.igv || 0
  const total = testData.total || 0

  return `
\x1B\x40
\x1B\x61\x01\x1B\x45\x01\x1B\x21\x30
${testData.companyName || 'RESTAURANTE MR FRIT'}
\x1B\x21\x00\x1B\x45\x00

\x1B\x61\x01
RUC: ${testData.companyRuc || '20123456789'}
${testData.companyAddress || 'Av. Principal 123, Lima'}
Tel: ${testData.companyPhone || '(01) 234-5678'}

\x1B\x61\x01\x1B\x45\x01
FACTURA ELECTRONICA
${testData.number || 'F001-00000001'}
\x1B\x45\x00

\x1B\x61\x00
Fecha: ${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}
Cliente: ${testData.customerName || 'Cliente Empresa SAC'}
RUC: ${testData.customerRuc || '20987654321'}
Direccion: ${testData.customerAddress || 'Av. Cliente 456, Lima'}
Mesa: ${testData.tableNumber || 'N/A'}
Mesero: ${testData.waiterName || 'Mesero Test'}

--------------------------------
DESCRIPCION    CANT   PRECIO TOTAL
--------------------------------
${items.map((item: any) => 
  `${item.description?.substring(0, 14).padEnd(14)} ${item.quantity.toString().padStart(3)} ${item.price?.toFixed(2).padStart(7)} ${item.total?.toFixed(2).padStart(6)}`
).join('\n')}
--------------------------------

\x1B\x61\x02
Subtotal:           S/ ${subtotal.toFixed(2)}
IGV:                 S/ ${igv.toFixed(2)}
\x1B\x45\x01
TOTAL:              S/ ${total.toFixed(2)}
\x1B\x45\x00

Pago: ${testData.paymentMethod || 'EFECTIVO'}
Recibido:           S/ ${testData.amountPaid?.toFixed(2) || total.toFixed(2)}
Vuelto:             S/ ${testData.change?.toFixed(2) || '0.00'}

\x1B\x61\x01
Representacion impresa de la
Factura Electronica
Gracias por su preferencia!

\x1B\x61\x00
\x1B\x64\x05
\x1D\x56\x42\x00
`
}

function generateCocinaTestContent(testData: any): string {
  const now = new Date()
  const items = testData.items || []

  return `
\x1B\x40
\x1B\x61\x01\x1B\x45\x01\x1B\x21\x30
TICKET DE COCINA
\x1B\x21\x00\x1B\x45\x00

\x1B\x61\x00
Orden: ${testData.orderNumber || 'ORD-001'}
Mesa: ${testData.tableNumber || '5'}
Fecha: ${now.toLocaleDateString('es-PE')}
Hora: ${now.toLocaleTimeString('es-PE')}
Mesero: ${testData.waiterName || 'Mesero Test'}

================================
\x1B\x45\x01
PREPARAR:
\x1B\x45\x00
================================

${items.map((item: any) => 
  `\x1B\x45\x01${item.quantity}x ${item.description}\x1B\x45\x00${item.notes ? `\n   Nota: ${item.notes}` : ''}\n`
).join('\n')}

================================

\x1B\x61\x01
${testData.specialInstructions || 'Sin instrucciones especiales'}

\x1B\x61\x00
\x1B\x64\x05
\x1D\x56\x42\x00
`
}
