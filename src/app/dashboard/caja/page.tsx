"use client"

import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Wallet, LockOpen, Lock, EyeOff } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

/**
 * US-10 — Apertura y arqueo ciego de caja por turno.
 * Mientras el turno está abierto, la pantalla NO muestra cuánto debería haber:
 * el cajero cuenta el efectivo físico y lo declara; recién al cerrar se ve el descuadre.
 */

interface TurnoAbierto {
  id: string
  openingAmount: number
  openedAt: string
  openedBy: { id: string; name: string }
}

interface Reporte {
  id: string
  openedAt: string
  closedAt: string
  openedBy: { name: string } | null
  closedBy: { name: string } | null
  openingAmount: number
  cashSales: number
  otherSales: number
  expectedAmount: number
  declaredAmount: number
  difference: number
  resultado: "CUADRADO" | "SOBRANTE" | "FALTANTE"
  invoiceCount: number
  notes: string | null
  porMetodo?: { paymentMethod: string; total: number; count: number }[]
}

const soles = (n: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n)
const fecha = (s: string) => new Date(s).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })

const colorResultado: Record<Reporte["resultado"], string> = {
  CUADRADO: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  SOBRANTE: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  FALTANTE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
}

export default function CajaPage() {
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [turno, setTurno] = useState<TurnoAbierto | null>(null)
  const [historial, setHistorial] = useState<Reporte[]>([])
  const [ultimoReporte, setUltimoReporte] = useState<Reporte | null>(null)
  const [fondo, setFondo] = useState("")
  const [contado, setContado] = useState("")
  const [notas, setNotas] = useState("")

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/cash-sessions")
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al cargar la caja")
      const data = await res.json()
      setTurno(data.current)
      setHistorial(data.history)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar la caja")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enviar = async (url: string, body: unknown) => {
    setEnviando(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Operación fallida")
      return data
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operación fallida")
      return null
    } finally {
      setEnviando(false)
    }
  }

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = Number(fondo)
    if (fondo === "" || Number.isNaN(monto)) return toast.error("Ingrese el fondo inicial")
    if (await enviar("/api/cash-sessions", { openingAmount: monto })) {
      toast.success("Caja abierta")
      setFondo("")
      setUltimoReporte(null)
      await cargar()
    }
  }

  const cerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = Number(contado)
    if (contado === "" || Number.isNaN(monto)) return toast.error("Ingrese el efectivo contado")
    const reporte = await enviar("/api/cash-sessions/close", {
      declaredAmount: monto,
      ...(notas.trim() ? { notes: notas.trim() } : {}),
    })
    if (reporte) {
      toast.success("Arqueo registrado")
      setUltimoReporte(reporte)
      setContado("")
      setNotas("")
      await cargar()
    }
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background text-foreground">
        <AdminPageHeader title="Caja" subtitle="Apertura y arqueo ciego por turno" backTo="/dashboard" icon={Wallet} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {cargando ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : turno ? (
            <section className="rounded-2xl border border-border bg-card p-6 space-y-5" data-testid="turno-abierto">
              <div className="flex items-center gap-3">
                <LockOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold">Turno abierto</h2>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Abierto por</dt>
                  <dd className="font-semibold">{turno.openedBy.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Desde</dt>
                  <dd className="font-semibold">{fecha(turno.openedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fondo inicial</dt>
                  <dd className="font-semibold">{soles(turno.openingAmount)}</dd>
                </div>
              </dl>

              <form onSubmit={cerrarCaja} className="space-y-4 border-t border-border pt-5">
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <EyeOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Arqueo ciego: cuente el efectivo físico de la caja (incluido el fondo inicial) y declárelo.
                  El sistema mostrará el monto esperado y el descuadre recién después de cerrar.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="contado">Efectivo contado (S/)</Label>
                  <Input
                    id="contado"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={contado}
                    onChange={(e) => setContado(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Observaciones (opcional)</Label>
                  <Textarea id="notas" maxLength={300} value={notas} onChange={(e) => setNotas(e.target.value)} />
                </div>
                <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
                  <Lock className="w-4 h-4 mr-2" />
                  Cerrar turno y generar arqueo
                </Button>
              </form>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4" data-testid="caja-cerrada">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-bold">No hay turno abierto</h2>
              </div>
              <form onSubmit={abrirCaja} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fondo">Fondo inicial (S/)</Label>
                  <Input
                    id="fondo"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={fondo}
                    onChange={(e) => setFondo(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
                  <LockOpen className="w-4 h-4 mr-2" />
                  Abrir caja
                </Button>
              </form>
            </section>
          )}

          {ultimoReporte && <ReporteArqueo reporte={ultimoReporte} />}

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">Historial de arqueos</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay turnos cerrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Cierre</th>
                      <th className="py-2 pr-4">Cerró</th>
                      <th className="py-2 pr-4 text-right">Esperado</th>
                      <th className="py-2 pr-4 text-right">Declarado</th>
                      <th className="py-2 pr-4 text-right">Diferencia</th>
                      <th className="py-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id} className="border-t border-border">
                        <td className="py-2 pr-4">{fecha(h.closedAt)}</td>
                        <td className="py-2 pr-4">{h.closedBy?.name ?? "—"}</td>
                        <td className="py-2 pr-4 text-right">{soles(h.expectedAmount)}</td>
                        <td className="py-2 pr-4 text-right">{soles(h.declaredAmount)}</td>
                        <td className="py-2 pr-4 text-right font-semibold">{soles(h.difference)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-md border text-xs font-bold ${colorResultado[h.resultado]}`}>
                            {h.resultado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </RoleGuard>
  )
}

function ReporteArqueo({ reporte }: { reporte: Reporte }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-4" data-testid="reporte-arqueo">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Reporte de arqueo</h2>
        <span className={`px-3 py-1 rounded-lg border text-sm font-black ${colorResultado[reporte.resultado]}`}>
          {reporte.resultado} {reporte.resultado !== "CUADRADO" && soles(Math.abs(reporte.difference))}
        </span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <Dato etiqueta="Fondo inicial" valor={soles(reporte.openingAmount)} />
        <Dato etiqueta="Ventas en efectivo" valor={soles(reporte.cashSales)} />
        <Dato etiqueta="Esperado en caja" valor={soles(reporte.expectedAmount)} />
        <Dato etiqueta="Declarado (contado)" valor={soles(reporte.declaredAmount)} />
        <Dato etiqueta="Diferencia" valor={soles(reporte.difference)} />
        <Dato etiqueta="Comprobantes" valor={String(reporte.invoiceCount)} />
      </dl>
      {reporte.porMetodo && reporte.porMetodo.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-2">Ventas por método de pago</p>
          <ul className="space-y-1">
            {reporte.porMetodo.map((m) => (
              <li key={m.paymentMethod} className="flex justify-between">
                <span>
                  {m.paymentMethod} ({m.count})
                </span>
                <span className="font-semibold">{soles(m.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reporte.notes && <p className="text-sm text-muted-foreground">Observaciones: {reporte.notes}</p>}
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}
