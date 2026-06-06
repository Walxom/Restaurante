import { type NextRequest, NextResponse } from 'next/server';
import { kitchenPrinter } from '@/services/printer/thermal-printer';
import { prisma } from '@/lib/prisma';
import { validateRole } from '@/lib/auth-utils';

// Tipos para las requests
interface PrintKitchenOrderRequest {
  orderId: string;
  tableNumber?: string;
  waiterName?: string;
  isUrgent?: boolean;
  customerName?: string;
}

// POST /api/thermal-print/kitchen - Imprimir orden de cocina
export async function POST(request: NextRequest) {
  try {
    // Validar sesión y rol
    const auth = await validateRole(['JEFE', 'MESERO']);
    if (!auth.isValid) return auth.response;

    const body: PrintKitchenOrderRequest = await request.json();
    
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
        table: true
      }
    });

    // Si no se encuentra por ID, intentar buscar por orderNumber
    if (!order) {
      // Remover el # si viene con el formato #2509018492
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
          table: true
        }
      });
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada. Verifica el ID o número de pedido.' },
        { status: 404 }
      );
    }
    
    // Construir datos para la impresora
    const kitchenOrder = {
      id: order.id,
      orderNumber: order.orderNumber, // Usar el orderNumber directamente
      tableNumber: body.tableNumber || order.table?.number.toString() || order.tableId || 'N/A',
      waiterName: body.waiterName || order.user?.name || 'Sistema',
      customerName: body.customerName || order.customerName || undefined,
      items: order.orderItems.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        notes: item.notes ? [item.notes] : [],
        allergies: [], // Agregarlo al schema si es necesario
        priority: item.product.categoryId === 'bebidas' ? 'normal' : 'normal' as const
      })),
      specialNotes: order.notes ? [order.notes] : [],
      isUrgent: body.isUrgent || order.status === 'PREPARING' || false,
      createdAt: order.createdAt
    };
    
    // Verificar configuración global del sistema
    const systemConfig = await prisma.systemConfig.findFirst();
    
    if (systemConfig && !systemConfig.isPrinterServiceEnabled) {
      console.log('ℹ️ Servicio de impresión desactivado globalmente');
      return NextResponse.json({
        success: true,
        message: 'Impresión omitida (servicio deshabilitado globalmente)',
        orderId: order.id,
        orderNumber: order.orderNumber,
        skipped: true
      });
    }
    
    // Verificar si la impresora de cocina está configurada y activa
    const printerConfig = await prisma.printer.findFirst({
      where: { 
        type: 'KITCHEN',
        status: 'ACTIVE'
      }
    });

    if (!printerConfig) {
      console.log('⚠️ Impresión en cocina omitida: Impresora no encontrada o desactivada');
      return NextResponse.json({
        success: true,
        message: 'Impresión en cocina omitida (impresora no configurada o deshabilitada)',
        orderId: order.id,
        orderNumber: order.orderNumber,
        skipped: true
      });
    }

    // Refrescar configuración de impresora antes de usar
    await kitchenPrinter.refreshConfig();
    
    // Imprimir en la cocina
    const result = await kitchenPrinter.printKitchenOrder(kitchenOrder);
    
    if (result.success) {
      // Actualizar estado de la orden en la base de datos
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          updatedAt: new Date(),
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status
        }
      });
      
      return NextResponse.json({
        success: true,
        message: result.message,
        orderId: order.id,
        orderNumber: kitchenOrder.orderNumber,
        commandSize: result.commandSize,
        printTime: result.printTime
      });
    } else {
      // Si el error es por falta de configuración, lo tratamos como un "skip" exitoso
      if (result.message.includes('configuración') || result.message.includes('no configurada')) {
        return NextResponse.json({
          success: true,
          message: result.message,
          orderId: order.id,
          orderNumber: kitchenOrder.orderNumber,
          skipped: true
        });
      }

      return NextResponse.json(
        { 
          error: 'Error de impresion',
          details: result.message,
          orderId: order.id
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error en API de impresion:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET /api/thermal-print/kitchen - Verificar conectividad sin imprimir
export async function GET() {
  try {
    // Refrescar configuración antes de probar conexión
    await kitchenPrinter.refreshConfig();
    
    // Solo verificar conectividad TCP sin imprimir
    const config = kitchenPrinter.printerConfig;
    if (!config || !config.ip || !config.port) {
      return NextResponse.json(
        {
          error: 'No hay configuración de impresora disponible',
          details: 'Configure la impresora de cocina en el panel de administración'
        },
        { status: 503 }
      );
    }

    // Verificar conectividad TCP al puerto 9100
    const isConnected = await checkTCPConnectivity(config.ip, config.port, 3000);
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Impresora de cocina conectada y disponible',
        config: {
          ip: config.ip,
          port: config.port,
          timeout: config.timeout
        },
        connectivityTest: {
          host: config.ip,
          port: config.port,
          connected: true,
          responseTime: '< 3000ms'
        }
      });
    } else {
      return NextResponse.json(
        {
          error: 'Impresora de cocina no disponible',
          details: `No se puede conectar a ${config.ip}:${config.port}`,
          config: {
            ip: config.ip,
            port: config.port,
            timeout: config.timeout
          },
          connectivityTest: {
            host: config.ip,
            port: config.port,
            connected: false,
            error: 'Puerto no accesible o impresora apagada'
          }
        },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('Error verificando conectividad de impresora:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función para verificar conectividad TCP sin imprimir
async function checkTCPConnectivity(ip: string, port: number, timeout: number = 3000): Promise<boolean> {
  const { createConnection } = await import('net');
  
  return new Promise((resolve) => {
    const socket = createConnection({
      host: ip,
      port: port,
      timeout: timeout
    });
    
    const timeoutId = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);
    
    socket.on('connect', () => {
      clearTimeout(timeoutId);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeoutId);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('timeout', () => {
      clearTimeout(timeoutId);
      socket.destroy();
      resolve(false);
    });
  });
}
