/**
 * API ENDPOINT PARA VISTA PREVIA DE BOLETAS/FACTURAS
 * Genera vista previa del comprobante de pago para el cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemConfig } from '@/lib/system-config-server';
import { PrinterConfigService } from '@/lib/printer-config';

interface ReceiptPreviewRequest {
  orderId: string;
  documentType?: 'BOLETA' | 'FACTURA';
  customerName?: string;
  customerRuc?: string;
  paymentMethod?: string;
  amountPaid?: number;
}

interface ReceiptData {
  type: string;
  number: string;
  orderNumber: string;
  issuedAt: string;
  customerName: string;
  customerRuc?: string;
  paymentMethod: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  igv: number;
  total: number;
  amountPaid: number;
  change: number;
  order: {
    table: {
      number: string;
    };
  };
}

// POST /api/thermal-print/receipt-preview - Generar vista previa de boleta/factura
export async function POST(request: NextRequest) {
  try {
    const body: ReceiptPreviewRequest = await request.json();
    
    if (!body.orderId) {
      return NextResponse.json(
        { error: 'ID de orden requerido' },
        { status: 400 }
      );
    }
    
    // Buscar la orden por ID interno o por orderNumber
    let order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        user: true,
        table: true,
        invoice: true
      }
    });

    // Si no se encuentra por ID, intentar buscar por orderNumber
    if (!order) {
      const cleanOrderNumber = body.orderId.replace('#', '');
      
      order = await prisma.order.findUnique({
        where: { orderNumber: cleanOrderNumber },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: true,
          table: true,
          invoice: true
        }
      });
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada. Verifica el ID o número de pedido.' },
        { status: 404 }
      );
    }
    
    // Determinar tipo de documento
    const documentType = body.documentType || (body.customerRuc ? 'FACTURA' : 'BOLETA');
    
    // Calcular totales
    const subtotal = Number(order.totalAmount) / 1.18; // Sin IGV
    const igv = Number(order.totalAmount) - subtotal;
    const total = Number(order.totalAmount);
    const amountPaid = body.amountPaid || total;
    const change = Math.max(0, amountPaid - total);
    
    // Obtener configuración del sistema
    const systemConfig = await getSystemConfig();
    
    // Construir datos del comprobante
    const receiptData: ReceiptData = {
      type: documentType,
      number: order.invoice?.number || `${documentType.charAt(0)}001-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      issuedAt: new Date().toISOString(),
      customerName: body.customerName || order.customerName || 'Cliente General',
      customerRuc: documentType === 'FACTURA' ? (body.customerRuc || '00000000000') : undefined,
      paymentMethod: body.paymentMethod || 'EFECTIVO',
      items: order.orderItems.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.subtotal)
      })),
      subtotal,
      igv,
      total,
      amountPaid,
      change,
      order: {
        table: {
          number: String(order.table?.number || 'Para llevar')
        }
      }
    };
    
    // Generar vista previa del comprobante
    const preview = generateReceiptPreview(receiptData, systemConfig);
    
    // Verificar estado del servicio de impresión fiscal
    const serviceStatus = await checkFiscalPrinterStatus();
    
    return NextResponse.json({
      success: true,
      preview,
      documentData: {
        type: documentType,
        number: receiptData.number,
        orderNumber: order.orderNumber,
        customerName: receiptData.customerName,
        total: total.toFixed(2),
        itemCount: order.orderItems.length
      },
      serviceStatus: {
        isAvailable: serviceStatus.isConnected,
        message: serviceStatus.message,
        lastCheck: new Date().toISOString()
      },
      systemConfig: {
        companyName: systemConfig.companyName || 'MR. FRIT',
        companyRuc: systemConfig.companyRuc || '00000000000',
        companyAddress: systemConfig.companyAddress || 'Dirección no configurada',
        companyPhone: systemConfig.companyPhone || 'N/A'
      }
    });
    
  } catch (error) {
    console.error('Error generando vista previa de comprobante:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * Generar vista previa del comprobante
 */
function generateReceiptPreview(data: ReceiptData, systemConfig: { companyName?: string | null; companyRuc?: string | null; companyAddress?: string | null; companyPhone?: string | null }): string {
  const lines: string[] = [];
  
  // Header del restaurante con datos reales
  lines.push('================================');
  lines.push(`      ${(systemConfig.companyName || 'MR. FRIT').toUpperCase()}`);
  if (systemConfig.companyRuc) {
    lines.push(`        RUC: ${systemConfig.companyRuc}`);
  }
  if (systemConfig.companyAddress) {
    lines.push(`   ${systemConfig.companyAddress}`);
  }
  if (systemConfig.companyPhone) {
    lines.push(`      Tel: ${systemConfig.companyPhone}`);
  }
  lines.push('================================');
  lines.push('');
  
  // Información del comprobante
  lines.push(`${data.type}: ${data.number}`);
  lines.push(`Fecha: ${new Date(data.issuedAt).toLocaleString('es-PE')}`);
  lines.push(`Mesa: ${data.order.table.number}`);
  lines.push('');
  
  // Información del cliente
  if (data.type === 'FACTURA' && data.customerRuc) {
    lines.push(`Cliente: ${data.customerName}`);
    lines.push(`RUC: ${data.customerRuc}`);
  } else {
    lines.push(`Cliente: ${data.customerName}`);
  }
  lines.push('');
  
  // Separador
  lines.push('================================');
  lines.push('       DETALLE DEL PEDIDO');
  lines.push('--------------------------------');
  
  // Items del pedido
  data.items.forEach((item) => {
    const itemLine = `${item.quantity}x ${item.productName}`;
    const priceLine = `S/ ${item.total.toFixed(2)}`;
    
    // Formatear línea con precio alineado a la derecha
    const maxWidth = 32;
    const priceWidth = priceLine.length;
    const itemWidth = Math.max(1, maxWidth - priceWidth);
    const truncatedItem = itemLine.length > itemWidth ? 
      itemLine.substring(0, itemWidth - 3) + '...' : itemLine;
    const padding = maxWidth - truncatedItem.length - priceWidth;
    
    lines.push(truncatedItem + ' '.repeat(Math.max(1, padding)) + priceLine);
  });
  
  // Totales
  lines.push('--------------------------------');
  lines.push(`Subtotal: S/ ${data.subtotal.toFixed(2)}`.padStart(32));
  lines.push(`IGV: S/ ${data.igv.toFixed(2)}`.padStart(32));
  lines.push(`TOTAL: S/ ${data.total.toFixed(2)}`.padStart(32));
  lines.push('');
  
  // Información de pago
  lines.push(`Pago: ${data.paymentMethod}`);
  lines.push(`Recibido: S/ ${data.amountPaid.toFixed(2)}`);
  
  if (data.change > 0) {
    lines.push(`Vuelto: S/ ${data.change.toFixed(2)}`);
  }
  
  lines.push('');
  
  // Footer
  lines.push('================================');
  lines.push('     Gracias por su preferencia!');
  lines.push('           Vuelva pronto');
  lines.push('================================');
  
  return lines.join('\n');
}

/**
 * Verificar estado de la impresora fiscal
 */
async function checkFiscalPrinterStatus(): Promise<{ isConnected: boolean; message: string }> {
  try {
    // Verificar si hay configuración de impresora fiscal
    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL');
    
    if (!fiscalPrinter) {
      return {
        isConnected: false,
        message: 'Impresora fiscal no configurada'
      };
    }
    
    // Simular verificación de conexión (en producción aquí iría la lógica real)
    return {
      isConnected: true,
      message: `Impresora fiscal disponible (${fiscalPrinter.connectionType}: ${fiscalPrinter.ipAddress || fiscalPrinter.serialPort || fiscalPrinter.usbPath || 'N/A'})`
    };
  } catch (error) {
    return {
      isConnected: false,
      message: 'Error verificando impresora fiscal: ' + (error instanceof Error ? error.message : 'Error desconocido')
    };
  }
}
