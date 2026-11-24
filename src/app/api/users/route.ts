import { NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { listUsers } from "@/services/user-admin.service"

// GET /api/users — lista de cuentas (solo JEFE). Nunca devuelve el hash de contraseña.
export async function GET() {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    return NextResponse.json({ users: await listUsers() })
  } catch (error) {
    console.error("Error al listar usuarios:", error)
    return NextResponse.json({ error: "Error al listar usuarios" }, { status: 500 })
  }
}
