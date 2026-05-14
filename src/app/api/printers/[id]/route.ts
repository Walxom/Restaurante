/**
 * API PARA GESTIÓN INDIVIDUAL DE IMPRESORAS
 * GET /api/printers/[id] - Obtener impresora específica
 * PUT /api/printers/[id] - Actualizar impresora específica
 * DELETE /api/printers/[id] - Eliminar impresora específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrinterConfigService } from '@/services/printer/printer-config';

// GET /api/printers/[id] - Obtener impresora específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const printer = await PrinterConfigService.getPrinterById(id);
    
    if (!printer) {
      return NextResponse.json(
        { error: 'Impresora no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ printer });

  } catch (error) {
    console.error('Error obteniendo impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/printers/[id] - Actualizar impresora específica
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const data = await request.json();
    const { id } = await params;
    
    // Validar datos requeridos
    if (!data.name || !data.type || !data.connectionType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, type, connectionType' },
        { status: 400 }
      );
    }

    // Validar tipo de impresora
    if (!['KITCHEN', 'CASH'].includes(data.type)) {
      return NextResponse.json(
        { error: 'Tipo de impresora inválido. Debe ser KITCHEN o CASH' },
        { status: 400 }
      );
    }

    // Validar tipo de conexión
    if (!['USB', 'NETWORK', 'BLUETOOTH'].includes(data.connectionType)) {
      return NextResponse.json(
        { error: 'Tipo de conexión inválido. Debe ser USB, NETWORK o BLUETOOTH' },
        { status: 400 }
      );
    }

    // Validar configuración específica según tipo de conexión
    if (data.connectionType === 'NETWORK') {
      if (!data.ipAddress || !data.port) {
        return NextResponse.json(
          { error: 'Para conexión de red se requiere ipAddress y port' },
          { status: 400 }
        );
      }
    } else if (data.connectionType === 'USB') {
      if (!data.usbPath) {
        return NextResponse.json(
          { error: 'Para conexión USB se requiere usbPath' },
          { status: 400 }
        );
      }
    } else if (data.connectionType === 'BLUETOOTH') {
      if (!data.bluetoothMac) {
        return NextResponse.json(
          { error: 'Para conexión Bluetooth se requiere bluetoothMac' },
          { status: 400 }
        );
      }
    }

    const printer = await PrinterConfigService.updatePrinter(
      id,
      data,
      session.user.id
    );
    
    if (!printer) {
      return NextResponse.json(
        { error: 'Impresora no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      printer,
      message: 'Impresora actualizada correctamente'
    });

  } catch (error) {
    console.error('Error actualizando impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/printers/[id] - Eliminar impresora específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar que la impresora existe
    const existing = await PrinterConfigService.getPrinterById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Impresora no encontrada' },
        { status: 404 }
      );
    }

    // No permitir eliminar impresoras por defecto
    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar una impresora por defecto. Establece otra como por defecto primero.' },
        { status: 400 }
      );
    }

    const success = await PrinterConfigService.deletePrinter(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Error eliminando impresora' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Impresora eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
