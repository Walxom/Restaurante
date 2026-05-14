import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSystemConfig } from '@/services/system.service'

interface PreReceiptPreviewRequest {
    orderId: string
    customerName?: string
}

interface PreviewItem {
    productName: string
    quantity: number
    total: number
}

interface PreviewData {
    issuedAt: string
    customerName: string
    items: PreviewItem[]
    subtotal: number
    igv: number
    total: number
    tableNumber: string
}

export async function POST(request: NextRequest) {
    try {
        const body: PreReceiptPreviewRequest = await request.json()
        if (!body.orderId) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 })
        }

        let order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: {
                orderItems: { include: { product: true } },
                user: true,
                table: true
            }
        })
        if (!order) {
            const clean = body.orderId.replace('#', '')
            order = await prisma.order.findUnique({
                where: { orderNumber: clean },
                include: {
                    orderItems: { include: { product: true } },
                    user: true,
                    table: true
                }
            })
        }

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
        }

        const subtotal = Number(order.totalAmount) / 1.18
        const igv = Number(order.totalAmount) - subtotal
        const total = Number(order.totalAmount)

        const data: PreviewData = {
            issuedAt: new Date().toISOString(),
            customerName: body.customerName || order.customerName || 'Cliente',
            items: order.orderItems.map(oi => ({
                productName: oi.product.name,
                quantity: oi.quantity,
                total: Number(oi.subtotal)
            })),
            subtotal,
            igv,
            total,
            tableNumber: String(order.table?.number || 'Para llevar')
        }

        const system = await getSystemConfig()
        const preview = generatePreReceiptPreview(data, system)

        return NextResponse.json({
            success: true,
            preview,
            documentData: {
                type: 'PRE-BOLETA',
                number: '',
                orderNumber: order.orderNumber,
                customerName: data.customerName,
                total: total.toFixed(2),
                itemCount: order.orderItems.length
            },
            systemConfig: {
                companyName: system.companyName || 'MR. FRIT',
                companyRuc: system.companyRuc || '00000000000',
                companyAddress: system.companyAddress || 'Dirección no configurada',
                companyPhone: system.companyPhone || 'N/A'
            }
        })
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
    }
}

function generatePreReceiptPreview(data: PreviewData, systemConfig: { companyName?: string | null; companyRuc?: string | null; companyAddress?: string | null; companyPhone?: string | null }) {
    const lines: string[] = []
    lines.push('================================')
    lines.push(`      ${(systemConfig.companyName || 'MR. FRIT').toUpperCase()}`)
    if (systemConfig.companyRuc) lines.push(`        RUC: ${systemConfig.companyRuc}`)
    if (systemConfig.companyAddress) lines.push(`   ${systemConfig.companyAddress}`)
    if (systemConfig.companyPhone) lines.push(`      Tel: ${systemConfig.companyPhone}`)
    lines.push('================================')
    lines.push('')
    lines.push('PRE-BOLETA')
    lines.push(`Fecha: ${new Date(data.issuedAt).toLocaleString('es-PE')}`)
    lines.push(`Mesa: ${data.tableNumber}`)
    lines.push('')
    lines.push(`Cliente: ${data.customerName}`)
    lines.push('')
    lines.push('================================')
    lines.push('       DETALLE DEL PEDIDO')
    lines.push('--------------------------------')
    data.items.forEach((item) => {
        const itemLine = `${item.quantity}x ${item.productName}`
        const priceLine = `S/ ${item.total.toFixed(2)}`
        const maxWidth = 32
        const priceWidth = priceLine.length
        const itemWidth = Math.max(1, maxWidth - priceWidth)
        const truncatedItem = itemLine.length > itemWidth ? itemLine.substring(0, itemWidth - 3) + '...' : itemLine
        const padding = maxWidth - truncatedItem.length - priceWidth
        lines.push(truncatedItem + ' '.repeat(Math.max(1, padding)) + priceLine)
    })
    lines.push('--------------------------------')
    lines.push(`Subtotal: S/ ${data.subtotal.toFixed(2)}`.padStart(32))
    lines.push(`IGV: S/ ${data.igv.toFixed(2)}`.padStart(32))
    lines.push(`TOTAL: S/ ${data.total.toFixed(2)}`.padStart(32))
    lines.push('')
    return lines.join('\n')
}
