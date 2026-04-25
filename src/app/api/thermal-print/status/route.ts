import { NextResponse } from 'next/server'
import { ThermalPrinter } from '@/lib/thermal-printer'

export async function GET() {
  try {
    // Crear instancia del servicio de impresión
    const printer = new ThermalPrinter()

    // Verificar estado de la impresora
    const status = await printer.checkServiceStatus()

    return NextResponse.json({
      success: true,
      status: status.isConnected ? 'connected' : 'disconnected',
      errorCode: status.isConnected ? null : 'CONNECTION_ERROR',
      message: status.message,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error verificando estado de impresora:', error)
    
    return NextResponse.json({
      success: false,
      status: 'error',
      errorCode: 'CONNECTION_ERROR',
      message: 'No se pudo verificar el estado de la impresora',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
