import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemConfig: { findFirst: vi.fn() },
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import {
  create,
  findAll,
  findById,
  getTodayStats,
  cancel,
} from '../invoice.service'

const baseDto = {
  type: 'BOLETA' as const,
  userId: 'user-1',
  paymentMethod: 'EFECTIVO' as const,
  amountPaid: 118,
  taxRate: 0.18,
  items: [{ description: 'Ceviche', quantity: 2, unitPrice: 50 }],
}

interface TxMock {
  systemConfig: {
    findFirstOrThrow: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  invoice: { create: ReturnType<typeof vi.fn> }
}

function makeTx(boletaNumber = 42, facturaNumber = 7): TxMock {
  return {
    systemConfig: {
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'cfg-1' }),
      update: vi.fn().mockResolvedValue({
        id: 'cfg-1',
        lastBoletaNumber: boletaNumber,
        lastFacturaNumber: facturaNumber,
      }),
    },
    invoice: {
      create: vi.fn().mockResolvedValue({
        id: 'inv-1',
        number: `B001-${String(boletaNumber).padStart(8, '0')}`,
      }),
    },
  }
}

// Shorthand: instala tx como callback de $transaction
function useTx(tx: TxMock) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx))
}

describe('invoice.service.create — correlativo fiscal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('usa increment:1 dentro de la transacción (no un valor pre-leído)', async () => {
    const tx = makeTx(42)
    useTx(tx)

    await create(baseDto)

    expect(tx.systemConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastBoletaNumber: { increment: 1 } }),
      })
    )
  })

  it('construye el número desde el RESULTADO del update, no de una lectura previa', async () => {
    const tx = makeTx(42)
    useTx(tx)

    // findFirst (fuera de tx) devuelve un valor obsoleto — no debe afectar el número
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue({
      id: 'cfg-1',
      lastBoletaNumber: 999, // valor obsoleto/stale
      lastFacturaNumber: 0,
      companyName: '',
      companyAddress: null,
      companyPhone: null,
      companyRuc: null,
      taxRate: 0.18,
      currency: 'PEN',
      timezone: 'America/Lima',
      isPrinterServiceEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    await create({ ...baseDto, taxRate: undefined }) // fuerza lectura de taxRate fuera de tx

    // El número debe venir del update result (42), no del findFirst obsoleto (999)
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ number: 'B001-00000042' }),
      })
    )
  })

  it('usa lastFacturaNumber para comprobante tipo FACTURA', async () => {
    const tx = makeTx(10, 7)
    useTx(tx)

    await create({ ...baseDto, type: 'FACTURA', amountPaid: 10000 })

    expect(tx.systemConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastFacturaNumber: { increment: 1 } }),
      })
    )
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ number: 'F001-00000007' }),
      })
    )
  })

  it('dos llamadas concurrentes obtienen correlativos distintos si el mock simula incremento real', async () => {
    let counter = 100

    const makeConcurrentTx = (): TxMock => ({
      systemConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'cfg-1' }),
        update: vi.fn().mockImplementation(() => {
          counter++
          return Promise.resolve({
            id: 'cfg-1',
            lastBoletaNumber: counter,
            lastFacturaNumber: 0,
          })
        }),
      },
      invoice: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: vi.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: `inv-${counter}`, number: data.number })
        ),
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb(makeConcurrentTx())
    )

    const [r1, r2] = await Promise.all([create(baseDto), create(baseDto)])

    expect((r1 as { number: string }).number).not.toBe(
      (r2 as { number: string }).number
    )
  })

  it('toma el taxRate de SystemConfig cuando el DTO no lo trae', async () => {
    const tx = makeTx(50)
    useTx(tx)
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue({
      taxRate: 0.18,
    } as never)

    // subtotal 100 → igv 18 → total 118; sin taxRate en el DTO
    await create({ ...baseDto, taxRate: undefined })

    expect(prisma.systemConfig.findFirst).toHaveBeenCalled()
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 100, igv: 18, total: 118 }),
      })
    )
  })

  it('usa 0.18 por defecto si no hay SystemConfig configurado', async () => {
    const tx = makeTx(51)
    useTx(tx)
    vi.mocked(prisma.systemConfig.findFirst).mockResolvedValue(null as never)

    await create({ ...baseDto, taxRate: undefined })

    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ igv: 18, total: 118 }),
      })
    )
  })
})

describe('invoice.service — consultas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('findAll calcula skip/take correctamente para la página solicitada', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as never)

    await findAll(3, 50) // page 3 → skip (3-1)*50 = 100

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 50 })
    )
  })

  it('findById incluye usuario, orden e items del comprobante', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({ id: 'inv-1' } as never)

    await findById('inv-1')

    expect(prisma.invoice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        include: expect.objectContaining({ items: true }),
      })
    )
  })

  it('getTodayStats agrega ingresos y calcula ticket promedio', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { total: 100, paymentMethod: 'EFECTIVO' },
      { total: 50, paymentMethod: 'YAPE' },
    ] as never)
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([
      { paymentMethod: 'EFECTIVO', _count: { id: 1 }, _sum: { total: 100 } },
      { paymentMethod: 'YAPE', _count: { id: 1 }, _sum: { total: 50 } },
    ] as never)

    const stats = await getTodayStats()

    expect(stats.summary.totalInvoices).toBe(2)
    expect(stats.summary.totalRevenue).toBe(150)
    expect(stats.summary.averageTicket).toBe(75)
    expect(stats.byPaymentMethod).toHaveLength(2)
  })

  it('getTodayStats devuelve ticket promedio 0 cuando no hay ventas', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([] as never)

    const stats = await getTodayStats()

    expect(stats.summary.totalRevenue).toBe(0)
    expect(stats.summary.averageTicket).toBe(0)
  })
})

describe('invoice.service.cancel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza error si el comprobante no existe', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null as never)
    await expect(cancel('x', 'motivo')).rejects.toThrow(
      'Comprobante con ID "x" no encontrado'
    )
  })

  it('lanza error si el comprobante ya está anulado', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: 'inv-1',
      status: 'CANCELLED',
    } as never)
    await expect(cancel('inv-1', 'motivo')).rejects.toThrow(
      'Este comprobante ya está anulado'
    )
    expect(prisma.invoice.update).not.toHaveBeenCalled()
  })

  it('anula un comprobante ISSUED registrando motivo y fecha', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: 'inv-1',
      status: 'ISSUED',
    } as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ id: 'inv-1' } as never)

    await cancel('inv-1', 'Error de digitación')

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancelReason: 'Error de digitación',
        }),
      })
    )
  })
})
