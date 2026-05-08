import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener estado básico de la impresora térmica
export async function GET() {
  try {
    // Obtener estado desde el endpoint de monitoreo térmico
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/thermal-print/monitor`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener estado del servicio térmico');
    }

    const thermalStatus = await response.json();
    
    return NextResponse.json({
      success: true,
      data: {
        isConnected: thermalStatus.status?.printerStatus === 'connected',
        printerStatus: thermalStatus.status?.printerStatus || 'disconnected',
        serviceRunning: thermalStatus.status?.isRunning || false,
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting printer status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado de impresora' },
      { status: 500 }
    );
  }
}

// POST - Acciones básicas sobre el servicio de impresión
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'start_service') {
      // Iniciar servicio de impresión térmica
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/thermal-print/start-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      return NextResponse.json({
        success: result.success,
        data: {
          message: result.message || 'Servicio iniciado',
          status: result.status
        },
        error: result.success ? null : result.error
      });
    }

    if (action === 'stop_service') {
      // Detener servicio de impresión térmica
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/thermal-print/stop-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      return NextResponse.json({
        success: result.success,
        data: {
          message: result.message || 'Servicio detenido',
          status: result.status
        },
        error: result.success ? null : result.error
      });
    }

    if (action === 'get_status') {
      // Obtener estado completo del servicio
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/thermal-print/monitor`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json(
      { success: false, error: 'Error al realizar acción' },
      { status: 500 }
    );
  }
}