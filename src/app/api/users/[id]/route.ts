import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateRole } from "@/lib/auth-utils"
import { updateUserSchema } from "@/features/auth/validations/user-admin"
import { UserAdminError, updateUser } from "@/services/user-admin.service"

// PATCH /api/users/[id] — el JEFE cambia la contraseña o activa/desactiva la cuenta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  try {
    const { id } = await params
    const user = await updateUser(auth.session.user.id, id, parsed.data)
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof UserAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo JEFE y MESERO pueden consultar información de usuarios
    if (!['JEFE', 'MESERO'].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}