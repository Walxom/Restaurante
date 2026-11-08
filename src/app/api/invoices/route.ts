import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { type Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createInvoiceSchema } from "@/features/billing/validations/invoice"

// GET /api/invoices - Listar facturas con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const type = searchParams.get("type") // BOLETA | FACTURA
    const status = searchParams.get("status") // ISSUED | CANCELLED
    const paymentMethod = searchParams.get("paymentMethod")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search")

    const where: Prisma.InvoiceWhereInput = {}

    if (type) where.type = type
    if (status) where.status = status
    if (paymentMethod) where.paymentMethod = paymentMethod

    if (startDate || endDate) {
      where.issuedAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
      }
    }

    if (search) {
      where.OR = [
        { number: { contains: search } },
        { customerName: { contains: search } },
        { customerRuc: { contains: search } }
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          user: {
            select: { name: true }
          },
          order: {
            select: { orderNumber: true, table: { select: { number: true } } }
          },
          items: true
        },
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where })
    ])

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Crear nueva factura desde pedido
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      )
    }
    const { orderId, type, customerName, customerRuc, customerAddress, paymentMethod, amountPaid, autoPrint } = parsed.data

    // Autorización por tipo de comprobante (estructura del body ya validada por Zod)
    if (type === "FACTURA" && session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "Solo los jefes pueden crear facturas" },
        { status: 403 }
      )
    }

    // Verificar que el pedido existe y está completado
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        orderItems: { include: { product: true } },
        invoice: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    if (order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Solo se pueden facturar pedidos completados" },
        { status: 400 }
      )
    }

    if (order.invoice) {
      return NextResponse.json(
        { error: "Este pedido ya tiene una factura emitida" },
        { status: 400 }
      )
    }

    // El totalAmount del pedido ya incluye IGV
    const total = Number(order.totalAmount)

    // Validar que el monto pagado cubre el total del pedido
    if (amountPaid < total) {
      return NextResponse.json(
        { error: "El monto pagado es menor al total de la factura" },
        { status: 400 }
      )
    }

    const change = amountPaid - total

    // Crear factura con transacción atómica.
    // El correlativo se genera DENTRO de la tx con increment:1 para evitar
    // que dos cajeros simultáneos obtengan el mismo número de comprobante.
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const field = type === "BOLETA" ? "lastBoletaNumber" : "lastFacturaNumber"
      const cfg = await tx.systemConfig.findFirstOrThrow()

      // El IGV se desglosa con la tasa configurada (SystemConfig.taxRate),
      // no con un valor fijo, para que el comprobante sea consistente si el
      // jefe cambia la tasa. total ya incluye IGV.
      const taxRate = Number(cfg.taxRate)
      const subtotal = total / (1 + taxRate)
      const igv = total - subtotal

      const updated = await tx.systemConfig.update({
        where: { id: cfg.id },
        data: { [field]: { increment: 1 } },
      })
      const nextNumber =
        type === "BOLETA" ? updated.lastBoletaNumber : updated.lastFacturaNumber
      const series = type === "BOLETA" ? "B001" : "F001"
      const invoiceNumber = `${series}-${String(nextNumber).padStart(8, "0")}`

      return tx.invoice.create({
        data: {
          number: invoiceNumber,
          type,
          orderId,
          customerName,
          customerRuc,
          customerAddress,
          subtotal,
          igv,
          total,
          paymentMethod,
          amountPaid: amountPaid,
          change,
          issuedBy: session.user.id,
          items: {
            create: order.orderItems.map((item) => ({
              description: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: Number(item.unitPrice) * item.quantity
            }))
          }
        },
        include: {
          items: true,
          user: { select: { name: true } },
          order: {
            include: {
              table: { select: { number: true } }
            }
          }
        }
      })
    })

    // Imprimir automáticamente si se solicita
    let printResult = null
    if (autoPrint) {
      try {
        // Usar la API de comprobantes con el puerto real configurado
        const port = process.env.PORT || 3001
        const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${port}`
        const response = await fetch(`${baseUrl}/api/thermal-print/receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: result.orderId,
            documentType: result.type,
            customerName: result.customerName,
            customerRuc: result.customerRuc,
            paymentMethod: result.paymentMethod || paymentMethod || 'EFECTIVO'
          }),
        })

        if (response.ok) {
          printResult = { success: true, message: 'Comprobante impreso exitosamente' }
        } else {
          const error = await response.json()
          printResult = { success: false, error: error.error || 'Error al imprimir' }
        }
      } catch (printError) {
        console.error("Error en impresión automática:", printError)
        // No fallar la creación de factura por error de impresión
        const errorMessage = printError && typeof printError === 'object' && 'message' in printError ? printError.message : 'Error desconocido'
        printResult = { success: false, error: errorMessage }
      }
    }

    return NextResponse.json({
      ...result,
      printResult
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

