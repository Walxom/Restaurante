import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from 'resend'
import { ReceiptEmail } from '@/emails/ReceiptEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "El correo electrónico es requerido" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: "Servicio de correo no configurado. Falta RESEND_API_KEY en el servidor." 
      }, { status: 500 })
    }

    const config = await prisma.systemConfig.findFirst()
    const companyName = config?.companyName || "Bendistaurante"

    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: true,
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const data = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`, // Resend testing domain
      to: [email],
      subject: `Comprobante de Pago ${invoice.number} - ${companyName}`,
      react: ReceiptEmail({
        companyName,
        customerName: invoice.customerName || "Cliente",
        invoiceNumber: invoice.number,
        invoiceType: invoice.type,
        date: new Date(invoice.issuedAt).toLocaleDateString("es-PE"),
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        subtotal: Number(invoice.subtotal),
        igv: Number(invoice.igv),
        total: Number(invoice.total),
      }),
    })

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al enviar el correo" },
      { status: 500 }
    )
  }
}
