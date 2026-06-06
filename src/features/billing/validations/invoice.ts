import { z } from 'zod'

export const PAYMENT_METHODS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN'] as const
export const INVOICE_TYPES = ['BOLETA', 'FACTURA'] as const

export const createInvoiceSchema = z
  .object({
    orderId: z.string().min(1, 'El ID del pedido es requerido'),
    type: z.enum(INVOICE_TYPES),
    customerName: z.string().optional(),
    customerRuc: z.string().optional(),
    customerAddress: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    amountPaid: z
      .number({ error: 'amountPaid debe ser un número' })
      .positive('El monto pagado debe ser mayor a 0'),
    autoPrint: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'FACTURA' && (!data.customerRuc || data.customerRuc.length !== 11)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RUC requerido y debe tener 11 dígitos para facturas',
        path: ['customerRuc'],
      })
    }
  })

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
