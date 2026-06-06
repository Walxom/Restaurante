import { NextRequest, NextResponse } from 'next/server'
import { thermalPrintQueue } from '@/services/printer/server-thermal-printer'
import { prisma } from "@/lib/prisma"
import { validateRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  const auth = await validateRole(['JEFE'])
  if (!auth.isValid) return auth.response

  try {
    // Inicializar el servicio de procesamiento de cola
    await thermalPrintQueue.startProcessing()

    // Persistir el estado en la base de datos
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: { isPrinterServiceEnabled: true },
      create: { 
        id: "default", 
        companyName: "Restaurant", 
        isPrinterServiceEnabled: true 
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Servicio de impresión térmica iniciado y guardado',
      data: {
        status: 'running',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error al iniciar servicio de impresión:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al iniciar servicio de impresión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    let status = thermalPrintQueue.getServiceStatus()

    // LOGICA DE AUTO-ARRANQUE:
    // Si el servicio no está corriendo en memoria, verificamos si debería estarlo según la DB
    if (!status.isRunning) {
      const config = await prisma.systemConfig.findFirst({
        where: { id: "default" }
      })

      if (config?.isPrinterServiceEnabled) {
        console.log('🔄 Auto-arrancando servicio de impresión basado en configuración de DB...')
        await thermalPrintQueue.startProcessing()
        // Actualizar estado después del arranque
        status = thermalPrintQueue.getServiceStatus()
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isRunning: status.isRunning,
        startedAt: status.startedAt,
        processedJobs: status.processedJobs,
        failedJobs: status.failedJobs,
        uptime: status.uptime,
        printerStatus: status.printerStatus
      }
    })
  } catch (error) {
    console.error('Error al obtener estado del servicio:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener estado del servicio' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await thermalPrintQueue.stopProcessing()

    // Persistir el estado detenido en la base de datos
    await prisma.systemConfig.update({
      where: { id: "default" },
      data: { isPrinterServiceEnabled: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Servicio de impresión térmica detenido y guardado',
      data: {
        status: 'stopped',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error al detener servicio de impresión:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al detener servicio de impresión' 
      },
      { status: 500 }
    )
  }
}

