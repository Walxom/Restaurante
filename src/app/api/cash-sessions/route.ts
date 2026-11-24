import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { openCashSessionSchema } from "@/features/billing/validations/cash-session"
import { CashSessionError, findHistory, findOpen, open } from "@/services/cash-session.service"

// GET /api/cash-sessions — turno abierto (vista ciega, sin esperado) + historial de arqueos
export async function GET() {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const [current, history] = await Promise.all([findOpen(), findHistory(10)])
    return NextResponse.json({ current, history })
  } catch (error) {
    console.error("Error al obtener turnos de caja:", error)
    return NextResponse.json({ error: "Error al obtener turnos de caja" }, { status: 500 })
  }
}

// POST /api/cash-sessions — abrir turno de caja con fondo inicial (US-10)
export async function POST(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  const parsed = openCashSessionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  try {
    const sesion = await open(auth.session.user.id, parsed.data.openingAmount)
    return NextResponse.json({ id: sesion.id, openedAt: sesion.openedAt }, { status: 201 })
  } catch (error) {
    if (error instanceof CashSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error al abrir turno de caja:", error)
    return NextResponse.json({ error: "Error al abrir turno de caja" }, { status: 500 })
  }
}
