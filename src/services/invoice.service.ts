/**
 * @service invoice.service.ts
 * Capa de servicios para la gestión de comprobantes fiscales (Boletas y Facturas).
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 * NUNCA importar directamente desde componentes React.
 */

import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type InvoiceType = "BOLETA" | "FACTURA"
export type PaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN"

export interface CreateInvoiceItemDto {
  description: string
  quantity: number
  unitPrice: number
}

export interface CreateInvoiceDto {
  type: InvoiceType
  orderId?: string | null
  userId: string
  customerName?: string | null
  customerRuc?: string | null
  customerAddress?: string | null
  paymentMethod: PaymentMethod
  amountPaid: number
  items: CreateInvoiceItemDto[]
  taxRate?: number // Por defecto se toma de system_config
}

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve todos los comprobantes con paginación.
 */
export async function findAll(page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize
  return prisma.invoice.findMany({
    include: {
      user: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true, table: { select: { number: true } } } },
    },
    orderBy: { issuedAt: "desc" },
    skip,
    take: pageSize,
  })
}

/**
 * Busca un comprobante por ID con todos sus detalles.
 */
export async function findById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      order: {
        include: {
          table: { select: { number: true } },
          orderItems: {
            include: { product: { select: { name: true, price: true } } },
          },
        },
      },
      items: true,
    },
  })
}

/**
 * Devuelve estadísticas de ventas del día actual.
 */
export async function getTodayStats() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [invoices, byPaymentMethod] = await Promise.all([
    prisma.invoice.findMany({
      where: { issuedAt: { gte: startOfDay }, status: "ISSUED" },
      select: { total: true, paymentMethod: true },
    }),
    prisma.invoice.groupBy({
      by: ["paymentMethod"],
      where: { issuedAt: { gte: startOfDay }, status: "ISSUED" },
      _count: { id: true },
      _sum: { total: true },
    }),
  ])

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const averageTicket = invoices.length ? totalRevenue / invoices.length : 0

  return {
    summary: {
      totalInvoices: invoices.length,
      totalRevenue,
      averageTicket,
    },
    byPaymentMethod: byPaymentMethod.map((g) => ({
      method: g.paymentMethod,
      count: g._count.id,
      total: Number(g._sum.total ?? 0),
    })),
  }
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Crea un comprobante fiscal.
 * Calcula subtotal, IGV y total basado en taxRate.
 * Genera número secuencial del tipo correcto.
 */
export async function create(dto: CreateInvoiceDto) {
  // Obtener configuración de impuestos si no se proveyó
  let taxRate = dto.taxRate
  if (taxRate === undefined) {
    const config = await prisma.systemConfig.findFirst()
    taxRate = config ? Number(config.taxRate) : 0.18
  }

  // Calcular montos
  const subtotalItems = dto.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )
  const igv = subtotalItems * taxRate
  const total = subtotalItems + igv
  const change = dto.amountPaid - total

  // Generar número secuencial
  const config = await prisma.systemConfig.findFirst()
  const lastNumber =
    dto.type === "BOLETA"
      ? (config?.lastBoletaNumber ?? 0) + 1
      : (config?.lastFacturaNumber ?? 0) + 1

  const prefix = dto.type === "BOLETA" ? "B001" : "F001"
  const number = `${prefix}-${String(lastNumber).padStart(8, "0")}`

  return prisma.$transaction(async (tx) => {
    // Actualizar número secuencial en configuración
    await tx.systemConfig.updateMany({
      data:
        dto.type === "BOLETA"
          ? { lastBoletaNumber: lastNumber }
          : { lastFacturaNumber: lastNumber },
    })

    return tx.invoice.create({
      data: {
        type: dto.type,
        number,
        status: "ISSUED",
        orderId: dto.orderId ?? null,
        issuedBy: dto.userId,
        customerName: dto.customerName ?? null,
        customerRuc: dto.customerRuc ?? null,
        customerAddress: dto.customerAddress ?? null,
        paymentMethod: dto.paymentMethod,
        subtotal: subtotalItems,
        igv,
        total,
        amountPaid: dto.amountPaid,
        change,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: true,
      },
    })
  })
}

/**
 * Anula un comprobante emitido. No se pueden anular comprobantes ya anulados.
 */
export async function cancel(id: string, reason: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })

  if (!invoice) {
    throw new Error(`Comprobante con ID "${id}" no encontrado`)
  }

  if (invoice.status === "CANCELLED") {
    throw new Error("Este comprobante ya está anulado")
  }

  return prisma.invoice.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date(),
    },
  })
}
