"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { Users, KeyRound, Lock } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

/**
 * Administración de cuentas (JEFE): cambiar contraseñas —incluidas las iniciales
 * del seed— y activar o desactivar cuentas. Cambiar la contraseña también levanta
 * un bloqueo por intentos fallidos.
 */

interface Usuario {
  id: string
  username: string
  name: string
  role: string
  isActive: boolean
  lockedUntil: string | null
}

const bloqueado = (u: Usuario) => !!u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now()

export default function UsuariosPage() {
  const { data: session } = useSession()
  const [cargando, setCargando] = useState(true)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [clave, setClave] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al cargar usuarios")
      setUsuarios((await res.json()).users)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar usuarios")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function actualizar(id: string, cambios: { password?: string; isActive?: boolean }) {
    setEnviando(true)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar")
      await cargar()
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar")
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function guardarClave(e: React.FormEvent, id: string) {
    e.preventDefault()
    if (clave !== confirmacion) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (await actualizar(id, { password: clave })) {
      toast.success("Contraseña actualizada")
      setEditando(null)
      setClave("")
      setConfirmacion("")
    }
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background text-foreground">
        <AdminPageHeader title="Usuarios" subtitle="Contraseñas y acceso de las cuentas" backTo="/dashboard" icon={Users} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Cambie las contraseñas iniciales antes de usar el sistema en el local. Mínimo 8 caracteres, con letras y números.
          </p>

          {cargando ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : (
            <ul className="space-y-3" data-testid="lista-usuarios">
              {usuarios.map((u) => {
                const esYo = u.id === session?.user?.id
                return (
                  <li key={u.id} className="rounded-2xl border border-border bg-card p-5 space-y-4" data-testid={`usuario-${u.username}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {u.name} <span className="text-muted-foreground font-normal">@{u.username}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-border px-2 py-0.5">{u.role}</span>
                          {!u.isActive && (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-400">
                              Desactivada
                            </span>
                          )}
                          {bloqueado(u) && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                              <Lock className="w-3 h-3" /> Bloqueada por intentos
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={u.isActive}
                            disabled={enviando || esYo}
                            onCheckedChange={(v) => actualizar(u.id, { isActive: v })}
                            aria-label={`Cuenta ${u.username} activa`}
                          />
                          Activa
                        </label>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setEditando(editando === u.id ? null : u.id)
                            setClave("")
                            setConfirmacion("")
                          }}
                        >
                          <KeyRound className="w-4 h-4" /> Cambiar contraseña
                        </Button>
                      </div>
                    </div>

                    {editando === u.id && (
                      <form onSubmit={(e) => guardarClave(e, u.id)} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3 sm:items-end">
                        <div className="space-y-2">
                          <Label htmlFor={`clave-${u.id}`}>Contraseña nueva</Label>
                          <Input
                            id={`clave-${u.id}`}
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={72}
                            value={clave}
                            onChange={(e) => setClave(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`confirmar-${u.id}`}>Repetir contraseña</Label>
                          <Input
                            id={`confirmar-${u.id}`}
                            type="password"
                            autoComplete="new-password"
                            value={confirmacion}
                            onChange={(e) => setConfirmacion(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" size="lg" disabled={enviando}>
                          Guardar
                        </Button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </RoleGuard>
  )
}
