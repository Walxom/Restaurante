import { z } from "zod"

const orderItemSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
})

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  type: z.enum(['MESA', 'PARA_LLEVAR', 'DELIVERY']).default('MESA'),
  customerName: z.string().optional(),
  customerDni: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerAddressReference: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un item"),
  isAdditionalOrder: z.boolean().default(false),
}).refine((data) => {
  if (data.type === 'MESA' && !data.tableId) return false
  return true
}, {
  message: "Los pedidos de mesa requieren una mesa asignada",
  path: ["tableId"],
}).refine((data) => {
  if (data.type === 'PARA_LLEVAR' && !data.customerName) return false
  return true
}, {
  message: "Los pedidos para llevar requieren nombre del cliente",
  path: ["customerName"],
}).refine((data) => {
  if (data.type === 'DELIVERY') {
    return !!(data.customerName && data.customerPhone && data.customerAddress)
  }
  return true
}, {
  message: "Los pedidos de delivery requieren nombre, teléfono y dirección",
  path: ["customerName"],
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SERVED', 'COMPLETED', 'CANCELLED']),
})

export const updateOrderSchema = z.object({
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerDni: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerAddressReference: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
