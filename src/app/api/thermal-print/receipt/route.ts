/**
 * API ENDPOINT PARA IMPRESIÓN DE BOLETAS/FACTURAS
 * Imprime comprobantes fiscales usando la impresora térmica
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ReceiptPrintRequest {
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

// POST /api/thermal-print/receipt - Imprimir boleta/factura
export async function POST(request: NextRequest) {
  try {
    const body: ReceiptPrintRequest = await request.json();
    
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
    
    // Verificar estado del servicio de impresión fiscal
    const serviceStatus = await checkFiscalPrinterStatus();
    
    if (!serviceStatus.isConnected) {
      return NextResponse.json(
        { 
          error: 'Impresora fiscal no disponible',
          details: serviceStatus.message,
          suggestion: 'Usa la vista previa mientras se resuelve el problema'
        },
        { status: 503 }
      );
    }
    
    // Generar número de comprobante si no existe
    let invoiceNumber = order.invoice?.number;
    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber(documentType);
    }
    
    // Construir datos del comprobante
    const receiptData = {
      type: documentType,
      number: invoiceNumber,
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
    
    // Intentar imprimir el comprobante
    const printResult = await printFiscalReceipt(receiptData);
    
    if (!printResult.success) {
      return NextResponse.json(
        { 
          error: 'Error al imprimir comprobante',
          details: printResult.error,
          suggestion: 'Verifica la conexión de la impresora fiscal'
        },
        { status: 500 }
      );
    }
    
    // Crear o actualizar la factura en la base de datos
    let invoice = order.invoice;
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          type: documentType,
          subtotal,
          igv,
          total,
          customerName: receiptData.customerName,
          customerRuc: receiptData.customerRuc,
          paymentMethod: 'EFECTIVO',
          amountPaid: amountPaid,
          change: change,
          orderId: order.id,
          issuedAt: new Date(),
          issuedBy: order.userId, // Usar el usuario del pedido
          status: 'ISSUED'
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `${documentType} impresa correctamente`,
      invoice: {
        number: invoiceNumber,
        type: documentType,
        total: total.toFixed(2),
        customerName: receiptData.customerName,
        orderId: order.id,
        orderNumber: order.orderNumber
      },
      printDetails: {
        printedAt: new Date().toISOString(),
        printerStatus: serviceStatus.message
      }
    });
    
  } catch (error) {
    console.error('Error imprimiendo comprobante:', error);
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
 * Verificar estado de la impresora fiscal
 */
async function checkFiscalPrinterStatus(): Promise<{ isConnected: boolean; message: string }> {
  try {
    // Importar servicio de configuración
    const { PrinterConfigService } = await import('@/services/printer/printer-config');
    const { getSystemConfig } = await import('@/services/system.service');
    
    // Obtener configuración de impresora fiscal
    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL');
    
    if (!fiscalPrinter) {
      return {
        isConnected: false,
        message: 'No se encontró configuración de impresora fiscal'
      };
    }
    
    if (fiscalPrinter.status !== 'ACTIVE') {
      return {
        isConnected: false,
        message: `Impresora fiscal está ${fiscalPrinter.status}`
      };
    }
    
    const port = fiscalPrinter.serialPort || fiscalPrinter.bluetoothAddress;
    if (!port) {
      return {
        isConnected: false,
        message: 'Puerto no configurado para impresora fiscal'
      };
    }

    // Obtener configuración del sistema para logs
    const systemConfig = await getSystemConfig();
    
    // Intentar una conexión rápida de prueba
    try {
      const { SerialPort } = await import('serialport');
      
      await new Promise<void>((resolve, reject) => {
        const testPrinter = new SerialPort({
          path: port,
          baudRate: 115200,
          autoOpen: false
        });
        
        const timeout = setTimeout(() => {
          testPrinter.close();
          reject(new Error('Timeout'));
        }, 3000);
        
        testPrinter.open((err?: Error | null) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            testPrinter.close(() => {
              resolve();
            });
          }
        });
      });
      
      return {
        isConnected: true,
        message: `Impresora fiscal operativa en ${port} (${systemConfig.companyName || 'Empresa'})`
      };
      
    } catch (testError) {
      return {
        isConnected: false,
        message: `Error conectando a ${port}: ${testError instanceof Error ? testError.message : 'Error desconocido'}`
      };
    }
    
  } catch (error) {
    return {
      isConnected: false,
      message: `Error verificando impresora fiscal: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Generar número de comprobante
 */
async function generateInvoiceNumber(type: 'BOLETA' | 'FACTURA'): Promise<string> {
  try {
    // Obtener el último número usado para este tipo de documento
    const lastInvoice = await prisma.invoice.findFirst({
      where: { type },
      orderBy: { number: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastInvoice?.number) {
      // Extraer el número secuencial del formato B001-000001 o F001-000001
      const matches = lastInvoice.number.match(/\d+$/);
      if (matches) {
        nextNumber = parseInt(matches[0]) + 1;
      }
    }
    
    const prefix = type === 'BOLETA' ? 'B001' : 'F001';
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    
    return `${prefix}-${paddedNumber}`;
  } catch {
    // Fallback si hay error
    const prefix = type === 'BOLETA' ? 'B001' : 'F001';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }
}

/**
 * Imprimir comprobante fiscal
 */
async function printFiscalReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
  try {
    // Importar dependencias necesarias
    const { PrinterConfigService } = await import('@/services/printer/printer-config');
    const { ReceiptTemplates } = await import('@/services/printer/thermal-printer-commands');
    const { getSystemConfig } = await import('@/services/system.service');
    
    // Obtener configuración de impresora fiscal
    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL');
    
    if (!fiscalPrinter) {
      throw new Error('No se encontró configuración de impresora fiscal activa');
    }
    
    if (fiscalPrinter.connectionType !== 'BLUETOOTH' && fiscalPrinter.connectionType !== 'SERIAL') {
      throw new Error('Impresora fiscal debe ser BLUETOOTH o SERIAL');
    }
    
    const port = fiscalPrinter.serialPort || fiscalPrinter.bluetoothAddress;
    if (!port) {
      throw new Error('Puerto o dirección Bluetooth no configurado para impresora fiscal');
    }

    // Obtener configuración del sistema para datos de la empresa
    const systemConfig = await getSystemConfig();
    
    console.log('Imprimiendo comprobante fiscal:', {
      type: data.type,
      number: data.number,
      total: data.total,
      customer: data.customerName,
      printer: {
        name: fiscalPrinter.name,
        connection: fiscalPrinter.connectionType,
        port: port
      }
    });
    
    // Generar comandos ESC/POS según el tipo de documento
    let escPosCommands: string;
    
    if (data.type === 'FACTURA') {
      escPosCommands = ReceiptTemplates.generateInvoice({
        companyName: systemConfig.companyName || 'Mr. Frit Restaurant',
        companyRuc: systemConfig.companyRuc || '20123456789',
        companyAddress: systemConfig.companyAddress || 'Av. Principal 123, Lima',
        companyPhone: systemConfig.companyPhone || '(01) 123-4567',
        invoiceNumber: data.number,
        orderNumber: data.orderNumber,
        date: new Date(data.issuedAt),
        customerName: data.customerName,
        customerRuc: data.customerRuc || '00000000000',
        table: data.order.table.number,
        items: data.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: data.subtotal,
        tax: data.igv,
        total: data.total,
        notes: `Pago: ${data.paymentMethod} - Vuelto: ${systemConfig.currency || 'S/'} ${data.change.toFixed(2)}`
      });
    } else {
      escPosCommands = ReceiptTemplates.generateReceipt({
        companyName: systemConfig.companyName || 'Mr. Frit Restaurant',
        companyRuc: systemConfig.companyRuc || '20123456789',
        companyAddress: systemConfig.companyAddress || 'Av. Principal 123, Lima',
        companyPhone: systemConfig.companyPhone || '(01) 123-4567',
        orderNumber: data.orderNumber,
        date: new Date(data.issuedAt),
        customerName: data.customerName,
        table: data.order.table.number,
        items: data.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: data.subtotal,
        igv: data.igv,
        total: data.total,
        notes: `Pago: ${data.paymentMethod} - Vuelto: ${systemConfig.currency || 'S/'} ${data.change.toFixed(2)}`
      });
    }
    
    // Enviar comandos a la impresora fiscal
    await sendToFiscalPrinter(port, escPosCommands, fiscalPrinter.timeout || 5000);
    
    return { success: true };
  } catch (error) {
    console.error('Error en printFiscalReceipt:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de impresión'
    };
  }
}

/**
 * Enviar datos a impresora fiscal por puerto serie/Bluetooth
 */
async function sendToFiscalPrinter(port: string, data: string, timeout: number = 5000): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Usar importación dinámica asíncrona
      const { SerialPort } = await import('serialport');
      
      const printer = new SerialPort({
        path: port,
        baudRate: 115200,
        autoOpen: false
      });
      
      // Timeout para la operación
      const timeoutId = setTimeout(() => {
        printer.close();
        reject(new Error(`Timeout al conectar con impresora fiscal en ${port}`));
      }, timeout);
      
      printer.open((openErr?: Error | null) => {
        if (openErr) {
          clearTimeout(timeoutId);
          reject(new Error(`Error abriendo puerto ${port}: ${openErr.message}`));
          return;
        }
        
        printer.write(data, (writeErr?: Error | null) => {
          if (writeErr) {
            clearTimeout(timeoutId);
            printer.close();
            reject(new Error(`Error escribiendo a ${port}: ${writeErr.message}`));
            return;
          }
          
          // Esperar un momento para que se complete la impresión
          setTimeout(() => {
            clearTimeout(timeoutId);
            printer.close(() => {
              resolve();
            });
          }, 1000);
        });
      });
      
    } catch (error) {
      reject(new Error(`Error iniciando impresión fiscal: ${error instanceof Error ? error.message : 'Error desconocido'}`));
    }
  });
}
