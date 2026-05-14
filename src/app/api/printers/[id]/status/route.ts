/**
 * API PARA GESTIÓN DE ESTADO DE IMPRESORAS
 * PATCH /api/printers/[id]/status - Cambiar estado de impresora
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrinterConfigService } from '@/services/printer/printer-config';

// PATCH /api/printers/[id]/status - Cambiar estado de impresora
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { status } = await request.json();
    const { id } = await params;
    
    if (!status || !['ACTIVE', 'INACTIVE', 'ERROR', 'MAINTENANCE'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser: ACTIVE, INACTIVE, ERROR o MAINTENANCE' },
        { status: 400 }
      );
    }

    const printer = await PrinterConfigService.updatePrinterStatus(
      id, 
      status, 
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
      message: `Estado de impresora cambiado a ${status}`
    });

  } catch (error) {
    console.error('Error cambiando estado de impresora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
