import { NextRequest, NextResponse } from 'next/server'
import { thermalPrintQueue } from '@/services/printer/server-thermal-printer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: thermalPrintQueue.getQueueStatus()
        })

      case 'statistics':
        return NextResponse.json({
          success: true,
          data: thermalPrintQueue.getStatistics()
        })

      case 'clear':
        const clearedCount = thermalPrintQueue.clearQueue()
        return NextResponse.json({
          success: true,
          message: `Cola limpiada: ${clearedCount} trabajos cancelados`,
          clearedCount
        })

      default:
        return NextResponse.json({
          success: true,
          data: {
            status: thermalPrintQueue.getQueueStatus(),
            statistics: thermalPrintQueue.getStatistics()
          }
        })
    }

  } catch (error) {
    console.error('❌ Error en monitor de impresión:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const action = searchParams.get('action')

    // Si es acción de limpiar cola
    if (action === 'clear') {
      thermalPrintQueue.clearQueue()
      return NextResponse.json({
        success: true,
        message: 'Cola de impresión limpiada exitosamente'
      })
    }

    // Si es cancelar un trabajo específico
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID requerido para cancelar trabajo específico' },
        { status: 400 }
      )
    }

    const cancelled = thermalPrintQueue.cancelJob(jobId)

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: 'Trabajo cancelado exitosamente'
      })
    } else {
      return NextResponse.json(
        { error: 'Trabajo no encontrado o no se puede cancelar' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('❌ Error al procesar solicitud DELETE:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
