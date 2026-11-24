/**
 * US-10 — Apertura y arqueo ciego de caja por turno.
 *
 * Criterio de aceptación (Product Backlog, Semana 8):
 *   "Dado el cierre de turno, cuando el cajero declara el dinero físico
 *    contado, entonces genera el reporte con saldo y descuadres."
 *
 * Reglas:
 *   - Solo puede haber un turno ABIERTO a la vez.
 *   - Mientras el turno está abierto NO se expone el monto esperado (arqueo ciego).
 *   - Esperado = fondo inicial + ventas en EFECTIVO emitidas durante el turno
 *     (comprobantes ISSUED; los anulados no cuentan).
 *   - Diferencia = declarado − esperado (> 0 sobrante, < 0 faltante).
 */
import { prisma } from "@/lib/prisma"

export const CASH_STATUS = { ABIERTA: "ABIERTA", CERRADA: "CERRADA" } as const

const redondear = (n: number) => Math.round(n * 100) / 100

const userSelect = { select: { id: true, name: true } } as const

export class CashSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "CashSessionError"
  }
}

/** Vista ciega del turno abierto: sin montos de ventas ni esperado. */
export async function findOpen() {
  const sesion = await prisma.cashSession.findFirst({
    where: { status: CASH_STATUS.ABIERTA },
    include: { openedBy: userSelect },
  })
  if (!sesion) return null
  return {
    id: sesion.id,
    status: sesion.status,
    openingAmount: Number(sesion.openingAmount),
    openedAt: sesion.openedAt,
    openedBy: sesion.openedBy,
  }
}

export async function open(userId: string, openingAmount: number) {
  return prisma.$transaction(async (tx) => {
    const abierta = await tx.cashSession.findFirst({ where: { status: CASH_STATUS.ABIERTA } })
    if (abierta) throw new CashSessionError("Ya existe un turno de caja abierto", 409)
    return tx.cashSession.create({
      data: { openingAmount: redondear(openingAmount), openedById: userId },
    })
  })
}

export interface ResumenMetodo {
  paymentMethod: string
  total: number
  count: number
}

export async function close(userId: string, declaredAmount: number, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const sesion = await tx.cashSession.findFirst({ where: { status: CASH_STATUS.ABIERTA } })
    if (!sesion) throw new CashSessionError("No hay un turno de caja abierto", 404)

    const cierre = new Date()
    const grupos = await tx.invoice.groupBy({
      by: ["paymentMethod"],
      where: { status: "ISSUED", issuedAt: { gte: sesion.openedAt, lte: cierre } },
      _sum: { total: true },
      _count: { _all: true },
    })

    const porMetodo: ResumenMetodo[] = grupos.map((g) => ({
      paymentMethod: g.paymentMethod,
      total: redondear(Number(g._sum.total ?? 0)),
      count: g._count._all,
    }))

    const cashSales = porMetodo.find((m) => m.paymentMethod === "EFECTIVO")?.total ?? 0
    const otherSales = redondear(
      porMetodo.filter((m) => m.paymentMethod !== "EFECTIVO").reduce((s, m) => s + m.total, 0),
    )
    const invoiceCount = porMetodo.reduce((s, m) => s + m.count, 0)
    const expectedAmount = redondear(Number(sesion.openingAmount) + cashSales)
    const declarado = redondear(declaredAmount)
    const difference = redondear(declarado - expectedAmount)

    const cerrada = await tx.cashSession.update({
      where: { id: sesion.id },
      data: {
        status: CASH_STATUS.CERRADA,
        closedAt: cierre,
        closedById: userId,
        declaredAmount: declarado,
        cashSales,
        otherSales,
        expectedAmount,
        difference,
        invoiceCount,
        notes: notes || null,
      },
      include: { openedBy: userSelect, closedBy: userSelect },
    })

    return { ...toReporte(cerrada), porMetodo }
  })
}

export async function findHistory(limit = 10) {
  const sesiones = await prisma.cashSession.findMany({
    where: { status: CASH_STATUS.CERRADA },
    orderBy: { closedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    include: { openedBy: userSelect, closedBy: userSelect },
  })
  return sesiones.map(toReporte)
}

type SesionConUsuarios = Awaited<ReturnType<typeof prisma.cashSession.update>> & {
  openedBy?: { id: string; name: string } | null
  closedBy?: { id: string; name: string } | null
}

/** Clasifica la diferencia del arqueo. */
export function resultadoArqueo(difference: number): "CUADRADO" | "SOBRANTE" | "FALTANTE" {
  if (Math.abs(difference) < 0.005) return "CUADRADO"
  return difference > 0 ? "SOBRANTE" : "FALTANTE"
}

function toReporte(s: SesionConUsuarios) {
  const difference = Number(s.difference ?? 0)
  return {
    id: s.id,
    status: s.status,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openedBy: s.openedBy ?? null,
    closedBy: s.closedBy ?? null,
    openingAmount: Number(s.openingAmount),
    cashSales: Number(s.cashSales ?? 0),
    otherSales: Number(s.otherSales ?? 0),
    expectedAmount: Number(s.expectedAmount ?? 0),
    declaredAmount: Number(s.declaredAmount ?? 0),
    difference,
    resultado: resultadoArqueo(difference),
    invoiceCount: s.invoiceCount ?? 0,
    notes: s.notes,
  }
}
