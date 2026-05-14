/**
 * API PARA ESTABLECER IMPRESORA POR DEFECTO
 * POST /api/printers/[id]/default - Establecer como impresora por defecto
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrinterConfigService } from '@/services/printer/printer-config';

// POST /api/printers/[id]/default - Establecer como impresora por defecto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'JEFE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;

    const printer = await PrinterConfigService.setDefaultPrinter(
      id, 
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
      message: `${printer.name} establecida como impresora por defecto para ${printer.type}`
    });

  } catch (error) {
    console.error('Error estableciendo impresora por defecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
