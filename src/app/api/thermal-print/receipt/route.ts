/**
 * API ENDPOINT PARA IMPRESIÓN DE BOLETAS/FACTURAS
 * Delega en receipt-printer.service para soportar ejecución modular e in-process
 */

import { type NextRequest, NextResponse } from 'next/server'
import { printReceiptForOrder, type ReceiptPrintRequest } from '@/services/printer/receipt-printer.service'

export async function POST(request: NextRequest) {
  try {
    const body: ReceiptPrintRequest = await request.json()
    const result = await printReceiptForOrder(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          details: result.details,
          suggestion: result.suggestion
        },
        { status: result.statusCode || 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error imprimiendo comprobante:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
