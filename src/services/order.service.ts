/**
 * @service order.service.ts
 * Capa de servicios para la gestión de pedidos.
 * Centraliza la lógica de negocio que antes vivía dispersa en las API routes de orders.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 * NUNCA importar directamente desde componentes React (solo desde rutas de API o server actions).
 */

import { prisma } from "@/lib/prisma"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED"

export type OrderType = "MESA" | "DELIVERY" | "LLEVAR"

export interface CreateOrderItemDto {
  productId: string
  quantity: number
  notes?: string | null
}

export interface CreateOrderDto {
  type: OrderType
  tableId?: string | null
  userId: string
  customerName?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  customerAddressReference?: string | null
  notes?: string | null
  items: CreateOrderItemDto[]
}

// ─── Selects reutilizables ───────────────────────────────────────────────────

const orderInclude = {
  user: { select: { id: true, name: true, role: true } },
  table: { select: { id: true, number: true, status: true, capacity: true } },
  orderItems: {
    include: {
      product: {
        select: { id: true, name: true, price: true, isAvailable: true, isActive: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  invoice: { select: { id: true, type: true, number: true } },
} as const

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Devuelve todos los pedidos activos (no completados ni cancelados).
 */
export async function findActive() {
  return prisma.order.findMany({
    where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Devuelve todos los pedidos (para vistas de administrador).
 */
export async function findAll() {
  return prisma.order.findMany({
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Busca un pedido por ID con todos sus detalles.
 */
export async function findById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })
}

/**
 * Busca pedidos por número de pedido o nombre de cliente.
 */
export async function search(query: string) {
  return prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: { contains: query } },
        { customerName: { contains: query } },
      ],
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
  })
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Crea un pedido con sus items en una transacción.
 * Calcula el totalAmount sumando (unitPrice * quantity) por cada item.
 */
export async function create(dto: CreateOrderDto) {
  // Validar que todos los productos existen y están disponibles
  const productIds = dto.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isAvailable: true, isActive: true },
  })

  if (products.length !== productIds.length) {
    throw new Error("Uno o más productos no están disponibles")
  }

  // Calcular total
  const totalAmount = dto.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!
    return sum + Number(product.price) * item.quantity
  }, 0)

  // Generar número de pedido único (Ej: PED-20250514-001)
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const count = await prisma.order.count()
  const orderNumber = `PED-${dateStr}-${String(count + 1).padStart(3, "0")}`

  return prisma.order.create({
    data: {
      orderNumber,
      type: dto.type,
      status: "PENDING",
      totalAmount,
      tableId: dto.tableId ?? null,
      userId: dto.userId,
      customerName: dto.customerName ?? null,
      customerPhone: dto.customerPhone ?? null,
      customerAddress: dto.customerAddress ?? null,
      customerAddressReference: dto.customerAddressReference ?? null,
      notes: dto.notes ?? null,
      orderItems: {
        create: dto.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!
          const unitPrice = Number(product.price)
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
            notes: item.notes ?? null,
            status: "PENDING",
          }
        }),
      },
    },
    include: orderInclude,
  })
}

/**
 * Actualiza el estado de un pedido.
 * Aplica lógica de negocio: no se puede revertir un pedido COMPLETED o CANCELLED.
 */
export async function updateStatus(id: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id } })

  if (!order) {
    throw new Error(`Pedido con ID "${id}" no encontrado`)
  }

  if (["COMPLETED", "CANCELLED"].includes(order.status)) {
    throw new Error(`No se puede cambiar el estado de un pedido ${order.status}`)
  }

  return prisma.order.update({
    where: { id },
    data: { status: newStatus },
    include: orderInclude,
  })
}

/**
 * Cancela un pedido y libera su mesa si aplica.
 */
export async function cancel(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { table: true },
  })

  if (!order) {
    throw new Error(`Pedido con ID "${id}" no encontrado`)
  }

  if (["COMPLETED", "CANCELLED"].includes(order.status)) {
    throw new Error(`El pedido ya está ${order.status}`)
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: orderInclude,
    })

    // Liberar mesa si aplica
    if (order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "DISPONIBLE" },
      })
    }

    return cancelled
  })
}

/**
 * Marca todos los items de un pedido como SERVED.
 */
export async function markAllItemsServed(orderId: string) {
  await prisma.orderItem.updateMany({
    where: { orderId, status: { not: "SERVED" } },
    data: { status: "SERVED" },
  })

  return prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  })
}
