import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const MAX_INTENTOS = 3
const BLOQUEO_MS = 15 * 60 * 1000
const VENTANA_MS = 30 * 60 * 1000

const intentosFallidos = new Map<string, { count: number; bloqueadoHasta: number; primerFallo: number }>()

function estaBloqueado(username: string): boolean {
  const entrada = intentosFallidos.get(username)
  if (!entrada) return false
  if (entrada.bloqueadoHasta > Date.now()) return true
  intentosFallidos.delete(username)
  return false
}

function registrarFallo(username: string): void {
  const ahora = Date.now()
  const existente = intentosFallidos.get(username)
  const entrada = (!existente || ahora - existente.primerFallo > VENTANA_MS)
    ? { count: 0, bloqueadoHasta: 0, primerFallo: ahora }
    : existente
  entrada.count += 1
  if (entrada.count >= MAX_INTENTOS) {
    entrada.bloqueadoHasta = ahora + BLOQUEO_MS
  }
  intentosFallidos.set(username, entrada)
}

function limpiarIntentos(username: string): void {
  intentosFallidos.delete(username)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        if (estaBloqueado(credentials.username)) {
          throw new Error("Bloqueado")
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username
          }
        })

        if (!user || !user.isActive) {
          registrarFallo(credentials.username)
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          registrarFallo(credentials.username)
          return null
        }

        limpiarIntentos(credentials.username)

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
