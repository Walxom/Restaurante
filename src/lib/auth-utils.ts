import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Obtiene la sesión actual en el lado del servidor
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Verifica si el usuario tiene uno de los roles permitidos
 * @returns Un objeto con la sesión si es válido, o una respuesta de error si no lo es
 */
export async function validateRole(allowedRoles: string[]) {
  const session = await getSession()
  
  if (!session) {
    return { 
      isValid: false, 
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) 
    }
  }
  
  if (!allowedRoles.includes(session.user.role)) {
    return { 
      isValid: false, 
      response: NextResponse.json({ error: "Prohibido: Permisos insuficientes" }, { status: 403 }) 
    }
  }
  
  return { isValid: true, session, response: null }
}
