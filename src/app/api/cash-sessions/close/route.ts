import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { closeCashSessionSchema } from "@/features/billing/validations/cash-session"
import { CashSessionError, close } from "@/services/cash-session.service"

// POST /api/cash-sessions/close — arqueo ciego: declarar efectivo contado y cerrar turno (US-10)
export async function POST(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  const parsed = closeCashSessionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  try {
    const reporte = await close(auth.session.user.id, parsed.data.declaredAmount, parsed.data.notes)
    return NextResponse.json(reporte)
  } catch (error) {
    if (error instanceof CashSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error al cerrar turno de caja:", error)
    return NextResponse.json({ error: "Error al cerrar turno de caja" }, { status: 500 })
  }
}
