import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Si el usuario ya está autenticado y trata de acceder a /login, lo redirigimos
    if (pathname === "/login" && token) {
      const redirectUrl = token.role === "JEFE" ? "/dashboard" : "/mesero"
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }

    // Redireccionar JEFE desde /mesero al dashboard
    if (pathname.startsWith("/mesero") && token?.role === "JEFE") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Rutas públicas que no requieren token
        if (
          pathname === "/login" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/public")
        ) {
          return true
        }

        // Verificar si el usuario está autenticado para las demás rutas
        if (!token) return false

        // Verificar rutas específicas por rol
        if (pathname.startsWith("/dashboard")) {
          return token.role === "JEFE"
        }

        if (pathname.startsWith("/menu")) {
          return token.role === "JEFE"
        }

        if (pathname.startsWith("/mesas")) {
          return token.role === "JEFE"
        }

        if (pathname.startsWith("/impresion")) {
          return token.role === "JEFE"
        }

        if (pathname.startsWith("/pedidos")) {
          return token.role === "MESERO" || token.role === "JEFE"
        }

        if (pathname.startsWith("/mesero")) {
          return token.role === "MESERO" || token.role === "JEFE"
        }

        // Proteger APIs (excepto auth y public)
        if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/public")) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/menu/:path*",
    "/mesas/:path*",
    "/mesero/:path*",
    "/impresion/:path*",
    "/pedidos/:path*",
    "/api/:path*"
  ]
}
