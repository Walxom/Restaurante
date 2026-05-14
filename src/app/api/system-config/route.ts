import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Buscar la configuración del sistema
    let config = await prisma.systemConfig.findFirst({
      where: { id: "default" }
    })

    // Si no existe, crear una por defecto
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          id: "default",
          companyName: "Restaurant",
          companyAddress: "Av. Principal 123, Lima",
          companyPhone: "+51 999 888 777",
          companyRuc: null,
          taxRate: 0.18,
          currency: "PEN",
          timezone: "America/Lima",
        }
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar datos requeridos
    if (!body.companyName) {
      return NextResponse.json(
        { error: "El nombre del restaurante es requerido" },
        { status: 400 }
      )
    }

    // Validar tasa de impuesto
    if (body.taxRate < 0 || body.taxRate > 1) {
      return NextResponse.json(
        { error: "La tasa de IGV debe estar entre 0 y 1" },
        { status: 400 }
      )
    }

    // Actualizar o crear la configuración
    const config = await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: {
        companyName: body.companyName,
        companyAddress: body.companyAddress || null,
        companyPhone: body.companyPhone || null,
        companyRuc: body.companyRuc || null,
        taxRate: parseFloat(body.taxRate),
        currency: body.currency || "PEN",
        timezone: body.timezone || "America/Lima",
        updatedAt: new Date(),
      },
      create: {
        id: "default",
        companyName: body.companyName,
        companyAddress: body.companyAddress || null,
        companyPhone: body.companyPhone || null,
        companyRuc: body.companyRuc || null,
        taxRate: parseFloat(body.taxRate),
        currency: body.currency || "PEN",
        timezone: body.timezone || "America/Lima",
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error al actualizar configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

