import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
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
          currency: "S/",
          timezone: "America/Lima",
        }
      })
    }

    // Retornar solo información pública (sin datos sensibles)
    return NextResponse.json({
      companyName: config.companyName,
      currency: config.currency
    })
  } catch (error) {
    console.error("Error al obtener información de la empresa:", error)

    // Retornar información por defecto en caso de error
    return NextResponse.json({
      companyName: "Restaurant",
      currency: "S/"
    })
  }
}

