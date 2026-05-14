import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface PreReceiptRequest {
    orderId: string
    customerName?: string
    paymentMethod?: string
    amountPaid?: number
}

interface ReceiptItem {
    productName: string
    quantity: number
    unitPrice: number
    total: number
}

interface PreReceiptData {
    orderNumber: string
    issuedAt: Date
    customerName: string
    paymentMethod: string
    items: ReceiptItem[]
    subtotal: number
    igv: number
    total: number
    amountPaid: number
    change: number
    tableNumber: string
}

export async function POST(request: NextRequest) {
    try {
        const body: PreReceiptRequest = await request.json()

        if (!body.orderId) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 })
        }

        let order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: {
                orderItems: { include: { product: true } },
                table: true,
                user: true
            }
        })

        if (!order) {
            const cleanOrderNumber = body.orderId.replace('#', '')
            order = await prisma.order.findUnique({
                where: { orderNumber: cleanOrderNumber },
                include: {
                    orderItems: { include: { product: true } },
                    table: true,
                    user: true
                }
            })
        }

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
        }

        const subtotal = Number(order.totalAmount) / 1.18
        const igv = Number(order.totalAmount) - subtotal
        const total = Number(order.totalAmount)
        const amountPaid = body.amountPaid || total
        const change = Math.max(0, amountPaid - total)

        const data: PreReceiptData = {
            orderNumber: order.orderNumber,
            issuedAt: new Date(),
            customerName: body.customerName || order.customerName || 'Cliente',
            paymentMethod: body.paymentMethod || 'EFECTIVO',
            items: order.orderItems.map(oi => ({
                productName: oi.product.name,
                quantity: oi.quantity,
                unitPrice: Number(oi.unitPrice),
                total: Number(oi.subtotal)
            })),
            subtotal,
            igv,
            total,
            amountPaid,
            change,
            tableNumber: String(order.table?.number || 'Para llevar')
        }

        const printResult = await printPreReceipt(data)
        if (!printResult.success) {
            return NextResponse.json({ error: printResult.error || 'Error de impresión' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Preboleta impresa correctamente',
            orderNumber: order.orderNumber,
            printedAt: new Date().toISOString()
        })
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
    }
}

async function printPreReceipt(data: PreReceiptData): Promise<{ success: boolean; error?: string }> {
    try {
        const { PrinterConfigService } = await import('@/services/printer/printer-config')
        const { ReceiptTemplates } = await import('@/services/printer/thermal-printer-commands')
        const { getSystemConfig } = await import('@/services/system.service')

        // Usar la impresora de caja (fiscal) como destino
        const cashPrinter = await PrinterConfigService.getPrinterByType('FISCAL')
        if (!cashPrinter) {
            throw new Error('No hay impresora de caja (fiscal) configurada')
        }
        if (cashPrinter.connectionType !== 'BLUETOOTH' && cashPrinter.connectionType !== 'SERIAL') {
            throw new Error('Impresora de caja debe ser BLUETOOTH o SERIAL')
        }
        const port = cashPrinter.serialPort || cashPrinter.bluetoothAddress
        if (!port) {
            throw new Error('Puerto o dirección Bluetooth no configurado para impresora de caja')
        }

        const system = await getSystemConfig()

        const escpos = ReceiptTemplates.generatePreReceipt({
            companyName: system.companyName || 'Mr. Frit Restaurant',
            companyRuc: system.companyRuc || '20123456789',
            companyAddress: system.companyAddress || 'Av. Principal 123, Lima',
            companyPhone: system.companyPhone || '(01) 123-4567',
            date: data.issuedAt,
            customerName: data.customerName,
            table: data.tableNumber,
            items: data.items.map(i => ({
                name: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.total
            })),
            total: data.total
        })

        await sendToCashPrinter(port, escpos, cashPrinter.timeout || 5000)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error de impresión' }
    }
}

async function sendToCashPrinter(port: string, data: string, timeout: number = 5000): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const { SerialPort } = await import('serialport')
            const printer = new SerialPort({ path: port, baudRate: 115200, autoOpen: false })
            const timeoutId = setTimeout(() => {
                printer.close()
                reject(new Error(`Timeout al conectar con impresora de caja en ${port}`))
            }, timeout)
            printer.open((openErr?: Error | null) => {
                if (openErr) {
                    clearTimeout(timeoutId)
                    reject(new Error(`Error abriendo puerto ${port}: ${openErr.message}`))
                    return
                }
                printer.write(data, (writeErr?: Error | null) => {
                    if (writeErr) {
                        clearTimeout(timeoutId)
                        printer.close()
                        reject(new Error(`Error escribiendo a ${port}: ${writeErr.message}`))
                        return
                    }
                    setTimeout(() => {
                        clearTimeout(timeoutId)
                        printer.close(() => resolve())
                    }, 1000)
                })
            })
        } catch (error) {
            reject(new Error(`Error iniciando impresión de caja: ${error instanceof Error ? error.message : 'Error desconocido'}`))
        }
    })
}
