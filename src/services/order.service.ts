/**
 * @service order.service.ts
 * Capa de servicios para la gestión de pedidos.
 * Centraliza la lógica de negocio que antes vivía dispersa en las API routes de orders.
 *
 * USO: Importar desde las API routes para separar lógica de negocio del transporte HTTP.
 * NUNCA importar directamente desde componentes React (solo desde rutas de API o server actions).
 */

import { Prisma } from "@prisma/client"
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

export interface UpdateOrderItemDto {
  id?: string
  productId: string
  quantity: number
  notes?: string | null
}

export interface UpdateOrderDto {
  notes?: string | null
  customerName?: string | null
  customerDni?: string | null
  items?: UpdateOrderItemDto[]
}

// Forma mínima de fila de producto que necesitan los callbacks de este servicio
type ProductRow = { id: string; price: number | string }

// ─── Selects reutilizables ───────────────────────────────────────────────────

const orderInclude = {
  user: { select: { id: true, name: true, username: true, role: true } },
  table: { select: { id: true, number: true, status: true, capacity: true } },
  orderItems: {
    include: {
      product: {
        select: { 
          id: true, 
          name: true, 
          price: true, 
          description: true,
          isAvailable: true, 
          isActive: true,
          category: { select: { name: true } }
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  invoice: { 
    select: { 
      id: true, 
      type: true, 
      number: true,
      customerName: true,
      customerRuc: true,
      customerAddress: true,
      subtotal: true,
      igv: true,
      total: true,
      paymentMethod: true,
      amountPaid: true,
      change: true,
      status: true,
      issuedAt: true,
      user: { select: { name: true } }
    } 
  },
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

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

/**
 * Actualiza los datos de un pedido, incluyendo sus items.
 * Maneja la lógica de items nuevos, editados y eliminados.
 */
export async function update(id: string, dto: UpdateOrderDto) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: { 
      orderItems: {
        include: { product: { select: { name: true } } }
      } 
    },
  })

  if (!existingOrder) {
    throw new Error(`Pedido con ID "${id}" no encontrado`)
  }

  const updateData: {
    notes?: string | null
    customerName?: string | null
    customerDni?: string | null
    totalAmount?: number
    status?: string
  } = {}
  if (dto.notes !== undefined) updateData.notes = dto.notes
  if (dto.customerName !== undefined) updateData.customerName = dto.customerName
  if (dto.customerDni !== undefined) updateData.customerDni = dto.customerDni

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Si se proporcionan items, procesar cambios
    if (dto.items && Array.isArray(dto.items)) {
      const items = dto.items

      // 1. Obtener productos necesarios para el cálculo de totales y precios
      const productIds = Array.from(new Set(items.map((i) => i.productId)))
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      })

      // 2. Calcular nuevo total
      let newTotalAmount = 0
      items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId)
        if (!product) throw new Error(`Producto ${item.productId} no encontrado`)
        newTotalAmount += Number(product.price) * item.quantity
      })
      updateData.totalAmount = newTotalAmount

      // 3. Identificar items a mantener, crear y eliminar
      const existingItemsInDb = await tx.orderItem.findMany({
        where: { orderId: id },
      })

      const dtoExistingItems = items.filter((i) => i.id && !i.id.startsWith("item_"))
      const dtoNewItems = items.filter((i) => !i.id || i.id.startsWith("item_"))
      const keepItemIds = dtoExistingItems.map((i) => i.id!)

      // Eliminar items que no están en el DTO (excepto los ya servidos)
      type DbItem = { id: string; status: string }
      const itemsToDelete = existingItemsInDb.filter(
        (dbItem) => !keepItemIds.includes(dbItem.id) && dbItem.status !== "SERVED"
      )

      if (itemsToDelete.length > 0) {
        await tx.orderItem.deleteMany({
          where: { id: { in: itemsToDelete.map((i) => i.id) } },
        })
      }

      // 4. Actualizar items existentes
      for (const itemDto of dtoExistingItems) {
        const product = products.find((p) => p.id === itemDto.productId)!
        await tx.orderItem.update({
          where: { id: itemDto.id },
          data: {
            quantity: itemDto.quantity,
            unitPrice: Number(product.price),
            subtotal: Number(product.price) * itemDto.quantity,
            notes: itemDto.notes ?? null,
          },
        })
      }

      // 5. Crear nuevos items
      if (dtoNewItems.length > 0) {
        await tx.orderItem.createMany({
          data: dtoNewItems.map((itemDto) => {
            const product = products.find((p) => p.id === itemDto.productId)!
            return {
              orderId: id,
              productId: itemDto.productId,
              quantity: itemDto.quantity,
              unitPrice: Number(product.price),
              subtotal: Number(product.price) * itemDto.quantity,
              notes: itemDto.notes ?? null,
              status: "PENDING",
            }
          }),
        })

        // Si el pedido estaba SERVED, volverlo a CONFIRMED para procesar nuevos items
        if (existingOrder.status === "SERVED") {
          updateData.status = "CONFIRMED"
        }
      }
    }

    // 6. Actualizar el pedido principal
    const updatedOrder = await tx.order.update({
      where: { id },
      data: updateData,
      include: orderInclude,
    })

    return updatedOrder
  })

  // 7. Disparar impresión en cocina (fuera de la transacción)
  if (dto.items && Array.isArray(dto.items)) {
    try {
      const { printOrderChanges } = await import("./printer/kitchen-printer.service")
      // No esperamos (await) a la impresión para no bloquear la respuesta de la API
      printOrderChanges(id, (existingOrder as any).orderItems, dto.items)
    } catch (e) {
      console.error("Error al intentar imprimir cambios:", e)
    }
  }

  return result
}
