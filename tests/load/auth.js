/**
 * Autenticación compartida para las pruebas k6 (NextAuth v4, Credentials).
 *
 * Se ejecuta UNA vez en `setup()` y devuelve la cookie de sesión que luego usan
 * todos los usuarios virtuales. Así no se dispara el bloqueo por intentos
 * fallidos ni se mide el costo de bcrypt en cada iteración.
 *
 * Prioridad:
 *   1. K6_AUTH_COOKIE (cookie ya obtenida manualmente)
 *   2. Login con K6_USER / K6_PASSWORD (por defecto, usuario semilla de desarrollo)
 */
import http from "k6/http"

export function obtenerCookieSesion(baseUrl) {
  if (__ENV.K6_AUTH_COOKIE) return __ENV.K6_AUTH_COOKIE

  const usuario = __ENV.K6_USER || "jefe"
  const clave = __ENV.K6_PASSWORD || "admin123"

  const csrf = http.get(`${baseUrl}/api/auth/csrf`)
  const csrfToken = csrf.json("csrfToken")

  http.post(
    `${baseUrl}/api/auth/callback/credentials`,
    { username: usuario, password: clave, csrfToken, json: "true" },
    { redirects: 0 },
  )

  const jar = http.cookieJar()
  const cookies = jar.cookiesForURL(baseUrl)
  const token = (cookies["next-auth.session-token"] || cookies["__Secure-next-auth.session-token"] || [])[0]

  if (!token) {
    throw new Error(`No se pudo iniciar sesión como "${usuario}" en ${baseUrl}`)
  }
  return `next-auth.session-token=${token}`
}
