import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



// GET /api/invoices/[id] - Obtener factura específica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await context.params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: { name: true }
        },
        order: {
          include: {
            table: { select: { number: true } },
            orderItems: {
              include: { product: true }
            }
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)

  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id] - Anular factura
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { action, cancelReason } = body

    if (action !== "cancel") {
      return NextResponse.json(
        { error: "Acción no válida" },
        { status: 400 }
      )
    }

    if (!cancelReason || cancelReason.trim().length < 5) {
      return NextResponse.json(
        { error: "Motivo de anulación requerido (mínimo 5 caracteres)" },
        { status: 400 }
      )
    }

    // Verificar que la factura existe
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    if (existingInvoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "La factura ya está anulada" },
        { status: 400 }
      )
    }

    // Verificar que la factura es del mismo día (regla de negocio)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const invoiceDate = new Date(existingInvoice.issuedAt)
    invoiceDate.setHours(0, 0, 0, 0)

    if (invoiceDate.getTime() !== today.getTime()) {
      return NextResponse.json(
        { error: "Solo se pueden anular facturas del día actual" },
        { status: 400 }
      )
    }

    // Anular la factura
    const cancelledInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: cancelReason.trim()
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

    return NextResponse.json(cancelledInvoice)

  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
