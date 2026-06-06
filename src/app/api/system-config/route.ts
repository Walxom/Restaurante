import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { systemConfigSchema } from "@/features/dashboard/validations/system-config"
import { invalidateConfigCache } from "@/services/system.service"

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

    // Validar datos con Zod Schema
    const result = systemConfigSchema.safeParse(body)
    if (!result.success) {
      const errorMessages = result.error.issues.map(err => err.message).join(", ")
      return NextResponse.json(
        { 
          error: errorMessages, 
          details: result.error.format() 
        },
        { status: 400 }
      )
    }

    const validatedData = result.data

    // Actualizar o crear la configuración
    const config = await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: {
        companyName: validatedData.companyName,
        companyAddress: validatedData.companyAddress || null,
        companyPhone: validatedData.companyPhone || null,
        companyRuc: validatedData.companyRuc || null,
        taxRate: validatedData.taxRate,
        currency: validatedData.currency,
        timezone: validatedData.timezone,
        updatedAt: new Date(),
      },
      create: {
        id: "default",
        companyName: validatedData.companyName,
        companyAddress: validatedData.companyAddress || null,
        companyPhone: validatedData.companyPhone || null,
        companyRuc: validatedData.companyRuc || null,
        taxRate: validatedData.taxRate,
        currency: validatedData.currency,
        timezone: validatedData.timezone,
      }
    })

    // Invalidar caché de servidor para asegurar consistencia de datos inmediata
    invalidateConfigCache()

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error al actualizar configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

