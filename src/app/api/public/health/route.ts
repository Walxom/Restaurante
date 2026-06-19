import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Endpoint de salud público (sin auth) para healthchecks de contenedores/orquestación.
// Permitido por el middleware bajo /api/public/*.
export async function GET() {
  try {
    // Verificar conectividad con la base de datos (consulta mínima)
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: "ok", db: "up" }, { status: 200 })
  } catch {
    // El proceso vive pero la BD no responde: degradado, no saludable.
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 })
  }
}
