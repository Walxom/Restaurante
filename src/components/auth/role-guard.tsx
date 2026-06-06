"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { AppLoading } from "@/features/dashboard/components/AppLoading"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = "/mesero" 
}: RoleGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (!allowedRoles.includes(session.user.role)) {
      router.push(fallbackPath)
    }
  }, [session, status, router, allowedRoles, fallbackPath])

  if (status === "loading") {
    return <AppLoading />
  }

  if (!session || !allowedRoles.includes(session.user.role)) {
    return null // O podrías retornar un mensaje de "No autorizado"
  }

  return <>{children}</>
}
