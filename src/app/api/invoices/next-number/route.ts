import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/invoices/next-number - Obtener siguiente número correlativo
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "JEFE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as "BOLETA" | "FACTURA"

    if (!type || !["BOLETA", "FACTURA"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de comprobante requerido (BOLETA o FACTURA)" },
        { status: 400 }
      )
    }

    // Obtener configuración del sistema
    let config = await prisma.systemConfig.findFirst()

    if (!config) {
      // Crear configuración por defecto si no existe
      config = await prisma.systemConfig.create({
        data: {
          companyName: "Nombre del Restaurante",
          companyAddress: "Dirección del Restaurante",
          companyPhone: "Teléfono del Restaurante",
          companyRuc: "RUC del Restaurante",
          taxRate: 0.18,
          currency: "S/",
          timezone: "America/Lima",
          lastBoletaNumber: 0,
          lastFacturaNumber: 0
        }
      })
    }

    const currentNumber = type === "BOLETA" 
      ? config.lastBoletaNumber 
      : config.lastFacturaNumber

    const nextNumber = currentNumber + 1
    const series = type === "BOLETA" ? "B001" : "F001"
    const nextInvoiceNumber = `${series}-${nextNumber.toString().padStart(8, "0")}`

    return NextResponse.json({
      type,
      currentNumber,
      nextNumber,
      series,
      nextInvoiceNumber
    })

  } catch (error) {
    console.error("Error getting next invoice number:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

