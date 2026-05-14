/**
 * API ENDPOINT PARA VERIFICACIÓN DE CONECTIVIDAD DE IMPRESORAS
 * Solo verifica si el puerto TCP está abierto, SIN imprimir (ahorro de papel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from 'net';

interface ConnectivityCheckRequest {
  printerType: 'kitchen' | 'fiscal';
  ip?: string;
  port?: number;
  timeout?: number;
}

// POST /api/printer-connectivity-check - Verificar conectividad TCP
export async function POST(request: NextRequest) {
  try {
    const body: ConnectivityCheckRequest = await request.json();
    
    if (body.printerType === 'kitchen') {
      return await checkKitchenPrinterConnectivity(body);
    } else {
      return NextResponse.json(
        { error: 'Tipo de impresora no soportado para verificación de conectividad' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error en verificación de conectividad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

async function checkKitchenPrinterConnectivity(params: ConnectivityCheckRequest): Promise<NextResponse> {
  // Obtener configuración desde la base de datos
  let ip = params.ip;
  let port = params.port;

  if (!ip || !port) {
    try {
      const { PrinterConfigService } = await import('@/services/printer/printer-config');
      const kitchenConfig = await PrinterConfigService.getKitchenPrinterConfig();
      
      if (kitchenConfig) {
        ip = kitchenConfig.ip;
        port = kitchenConfig.port;
      } else {
        // Fallback a IP actualizada
        ip = process.env.KITCHEN_PRINTER_IP || '192.168.0.150';
        port = parseInt(process.env.KITCHEN_PRINTER_PORT || '9100');
      }
    } catch (dbError) {
      console.log('⚠️ No se pudo obtener configuración de BD, usando valores por defecto:', dbError);
      ip = '192.168.0.150';
      port = 9100;
    }
  }

  const timeout = params.timeout || 3000; // 3 segundos timeout

  return new Promise((resolve) => {
    console.log(`🔍 Verificando conectividad TCP con impresora de cocina: ${ip}:${port}`);
    
    const startTime = Date.now();
    const socket = createConnection({
      host: ip,
      port: port,
      timeout: timeout
    });

    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout verificando conectividad con ${ip}:${port}`);
      socket.destroy();
      resolve(NextResponse.json({
        success: true,
        isReachable: false,
        ip: ip,
        port: port,
        responseTime: null,
        error: `Timeout después de ${timeout}ms`,
        message: `No se pudo conectar a la impresora en ${ip}:${port}. Verifique que esté encendida y en la red.`
      }));
    }, timeout);

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);
      socket.destroy(); // Cerrar inmediatamente, solo queremos verificar conectividad
      
      console.log(`✅ Impresora de cocina conectada en ${responseTime}ms`);
      resolve(NextResponse.json({
        success: true,
        isReachable: true,
        ip: ip,
        port: port,
        responseTime: responseTime,
        message: `Impresora de cocina disponible en ${ip}:${port} (${responseTime}ms)`
      }));
    });

    socket.on('error', (error) => {
      clearTimeout(timeoutId);
      console.log(`❌ Error de conectividad con ${ip}:${port}: ${error.message}`);
      resolve(NextResponse.json({
        success: true,
        isReachable: false,
        ip: ip,
        port: port,
        responseTime: null,
        error: error.message,
        message: `Error conectando a ${ip}:${port}: ${error.message}`
      }));
    });

    socket.on('timeout', () => {
      clearTimeout(timeoutId);
      socket.destroy();
      console.log(`⏰ Timeout de socket con ${ip}:${port}`);
      resolve(NextResponse.json({
        success: true,
        isReachable: false,
        ip: ip,
        port: port,
        responseTime: null,
        error: 'Socket timeout',
        message: `Timeout conectando a ${ip}:${port}`
      }));
    });
  });
}

// GET /api/printer-connectivity-check - Información del endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/printer-connectivity-check',
    description: 'Verifica conectividad TCP con impresoras sin imprimir',
    methods: ['POST'],
    parameters: {
      printerType: 'kitchen | fiscal',
      ip: 'string (opcional - se obtiene de BD)',
      port: 'number (opcional - se obtiene de BD)',
      timeout: 'number (opcional - default 3000ms)'
    },
    examples: {
      kitchen: {
        printerType: 'kitchen'
      },
      customKitchen: {
        printerType: 'kitchen',
        ip: '192.168.0.150',
        port: 9100,
        timeout: 5000
      }
    }
  });
}
