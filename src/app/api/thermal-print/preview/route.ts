/**
 * API ENDPOINT PARA VISTA PREVIA DE TICKETS
 * Siempre muestra la vista previa, independiente del estado del servicio
 */

import { NextRequest, NextResponse } from 'next/server';
import { kitchenPrinter } from '@/services/printer/thermal-printer';
import { prisma } from '@/lib/prisma';

interface PreviewRequest {
  orderId: string;
  tableNumber?: string;
  waiterName?: string;
  isUrgent?: boolean;
  customerName?: string;
}

// POST /api/thermal-print/preview - Generar vista previa
export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json();
    
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
    
    // Construir datos para la vista previa
    const kitchenOrder = {
      id: order.id,
      orderNumber: order.orderNumber, // Usar el orderNumber directamente del modelo
      tableNumber: body.tableNumber || order.table?.number.toString() || order.tableId || 'N/A',
      waiterName: body.waiterName || order.user?.name || 'Sistema',
      customerName: body.customerName || order.customerName || undefined,
      items: order.orderItems.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        notes: item.notes ? [item.notes] : [],
        allergies: [],
        priority: 'normal' as const
      })),
      specialNotes: order.notes ? [order.notes] : [],
      isUrgent: body.isUrgent || order.status === 'PREPARING' || false,
      createdAt: order.createdAt
    };
    
    // Generar vista previa (siempre funciona, no depende del estado del servicio)
    const preview = kitchenPrinter.generateTicketPreview(kitchenOrder);
    
    // Verificar estado del servicio de impresión
    const serviceStatus = await kitchenPrinter.checkServiceStatus();
    
    return NextResponse.json({
      success: true,
      preview,
      orderData: {
        orderNumber: kitchenOrder.orderNumber,
        tableNumber: kitchenOrder.tableNumber,
        itemCount: order.orderItems.length,
        isUrgent: kitchenOrder.isUrgent
      },
      serviceStatus: {
        isAvailable: serviceStatus.isConnected,
        message: serviceStatus.message,
        lastCheck: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error generando vista previa:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
