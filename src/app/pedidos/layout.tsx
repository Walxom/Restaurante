import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PedidosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Verificar autenticación
  if (!session) {
    redirect('/login')
  }

  // Verificar que el usuario tenga permisos (JEFE o MESERO)
  if (!['JEFE', 'MESERO'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}