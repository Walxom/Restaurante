/**
 * API PARA GESTIÓN DE CONFIGURACIÓN DE IMPRESORAS
 * Permite obtener y actualizar la configuración de impresoras desde la base de datos
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrinterConfigService } from '@/services/printer/printer-config';

// GET /api/printers - Obtener todas las impresoras
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    if (type) {
      // Obtener impresora específica por tipo
      const printer = await PrinterConfigService.getPrinterByType(type as 'KITCHEN' | 'RECEIPT' | 'FISCAL');
      return NextResponse.json({ printer });
    } else if (activeOnly) {
      // Obtener solo impresoras activas
      const printers = await PrinterConfigService.getActivePrinters();
      return NextResponse.json({ printers });
    } else {
      // Obtener todas las impresoras (requiere rol JEFE)
      if (session.user.role !== 'JEFE') {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      
      const printers = await PrinterConfigService.getActivePrinters();
      return NextResponse.json({ printers });
    }

  } catch (error) {
    console.error('Error obteniendo impresoras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/printers - Crear nueva impresora
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const printerData = await request.json();
    
    // Validar datos requeridos
    if (!printerData.name || !printerData.type || !printerData.connectionType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, type, connectionType' },
        { status: 400 }
      );
    }

    const printer = await PrinterConfigService.createPrinter(printerData, session.user.id);
    
    return NextResponse.json({ 
      success: true,
      printer,
      message: 'Impresora creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/printers - Actualizar impresora existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de impresora requerido' },
        { status: 400 }
      );
    }

    const printer = await PrinterConfigService.updatePrinter(id, updateData, session.user.id);
    
    if (!printer) {
      return NextResponse.json(
        { error: 'Impresora no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      printer,
      message: 'Impresora actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
