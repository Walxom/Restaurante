import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemConfig: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { create } from '../invoice.service'

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
})
