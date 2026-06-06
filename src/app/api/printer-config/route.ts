import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type PrinterType, type PrinterConnectionType, type PrinterStatus } from '@/types'
import { printerConfigSchema } from '@/features/billing/validations/printer-config'

// Configuraciones por defecto
const DEFAULT_CONFIGS = {
  fiscal: {
    id: 'fiscal',
    name: 'Impresora Fiscal',
    type: 'FISCAL' as PrinterType,
    connectionType: 'BLUETOOTH' as PrinterConnectionType,
    enabled: true,
    status: 'ACTIVE' as PrinterStatus,
    serialPort: 'COM7',
    timeout: 10000,
    charactersPerLine: 32,
    paperWidth: 58
  },
  kitchen: {
    id: 'kitchen', 
    name: 'Impresora de Cocina ZJ-8360',
    type: 'KITCHEN' as PrinterType,
    connectionType: 'NETWORK' as PrinterConnectionType,
    enabled: true,
    status: 'ACTIVE' as PrinterStatus,
    ipAddress: '192.168.0.151',  // Se actualizará dinámicamente desde configuración guardada
    port: 9100,
    timeout: 5000,
    charactersPerLine: 32,
    paperWidth: 58
  }
}

// Función para obtener o crear configuraciones por defecto
async function getOrCreatePrinterConfigs() {
  try {
    // Buscar impresoras existentes
    const existingPrinters = await prisma.printer.findMany({
      where: {
        OR: [
          { type: 'FISCAL' },
          { type: 'KITCHEN' }
        ]
      }
    })

    // Si no existen impresoras, crear las por defecto
    if (existingPrinters.length === 0) {
      console.log('📝 Creando configuraciones de impresoras por defecto...')
      
      // Obtener el primer usuario JEFE para asignar como creador
      const adminUser = await prisma.user.findFirst({
        where: { role: 'JEFE' }
      })

      if (!adminUser) {
        throw new Error('No se encontró un usuario administrador')
      }

      const fiscalPrinter = await prisma.printer.create({
        data: {
          name: DEFAULT_CONFIGS.fiscal.name,
          type: DEFAULT_CONFIGS.fiscal.type,
          connectionType: DEFAULT_CONFIGS.fiscal.connectionType,
          serialPort: DEFAULT_CONFIGS.fiscal.serialPort,
          timeout: DEFAULT_CONFIGS.fiscal.timeout,
          charactersPerLine: DEFAULT_CONFIGS.fiscal.charactersPerLine,
          paperWidth: DEFAULT_CONFIGS.fiscal.paperWidth,
          status: DEFAULT_CONFIGS.fiscal.status,
          isDefault: true,
          createdBy: adminUser.id
        }
      })

      const kitchenPrinter = await prisma.printer.create({
        data: {
          name: DEFAULT_CONFIGS.kitchen.name,
          type: DEFAULT_CONFIGS.kitchen.type,
          connectionType: DEFAULT_CONFIGS.kitchen.connectionType,
          ipAddress: DEFAULT_CONFIGS.kitchen.ipAddress,
          port: DEFAULT_CONFIGS.kitchen.port,
          timeout: DEFAULT_CONFIGS.kitchen.timeout,
          charactersPerLine: DEFAULT_CONFIGS.kitchen.charactersPerLine,
          paperWidth: DEFAULT_CONFIGS.kitchen.paperWidth,
          status: DEFAULT_CONFIGS.kitchen.status,
          isDefault: true,
          createdBy: adminUser.id
        }
      })

      return [fiscalPrinter, kitchenPrinter]
    }

    return existingPrinters
  } catch (error) {
    console.error('Error obteniendo/creando configuraciones de impresoras:', error)
    throw error
  }
}

// Función para convertir modelo de DB a formato API
function formatPrinterForAPI(printer: {
  type: PrinterType
  name: string
  connectionType: PrinterConnectionType
  status: PrinterStatus
  serialPort?: string | null
  ipAddress?: string | null
  port?: number | null
  timeout?: number | null
}) {
  const baseFormat = {
    id: printer.type.toLowerCase(),
    name: printer.name,
    type: printer.connectionType.toLowerCase(),
    enabled: printer.status === 'ACTIVE',
    status: printer.status === 'ACTIVE' ? 'connected' : 'disconnected'
  }

  if (printer.type === 'FISCAL') {
    return {
      ...baseFormat,
      port: printer.serialPort || 'COM7',
      baudRate: 115200 // Valor por defecto para compatibilidad
    }
  } else if (printer.type === 'KITCHEN') {
    return {
      ...baseFormat,
      ip: printer.ipAddress || undefined,
      port: printer.port || 9100,
      timeout: printer.timeout || 5000
    }
  }

  return baseFormat
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener configuraciones de la base de datos
    const printers = await getOrCreatePrinterConfigs()
    
    // Formatear para la API
    const configs: { 
      fiscal?: ReturnType<typeof formatPrinterForAPI>; 
      kitchen?: ReturnType<typeof formatPrinterForAPI> 
    } = {}
    printers.forEach((printer: { type: string; [key: string]: unknown }) => {
      if (printer.type === 'FISCAL') {
        configs.fiscal = formatPrinterForAPI(printer as any)
      } else if (printer.type === 'KITCHEN') {
        configs.kitchen = formatPrinterForAPI(printer as any)
      }
    })

    return NextResponse.json(configs)
  } catch (error) {
    console.error('Error obteniendo configuración de impresoras:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar datos con Zod Schema
    const result = printerConfigSchema.safeParse(body)
    if (!result.success) {
      const errorMessages = result.error.issues.map(err => err.message).join(", ")
      return NextResponse.json(
        { 
          error: errorMessages, 
          details: result.error.format() 
        },
        { status: 400 }
      )
    }

    const { printerId, config } = result.data

    console.log(`📝 Actualizando configuración de impresora ${printerId}:`, config)

    // Determinar el tipo de impresora
    const printerType = printerId === 'fiscal' ? 'FISCAL' : 'KITCHEN'
    
    // Buscar impresora existente
    const existingPrinter = await prisma.printer.findFirst({
      where: { type: printerType }
    })

    let updatedPrinter

    if (existingPrinter) {
      // Actualizar impresora existente
      const updateData: {
        name: string
        status: PrinterStatus
        updatedBy: string
        serialPort?: string
        ipAddress?: string
        port?: number
        timeout?: number
      } = {
        name: config.name,
        status: config.enabled ? 'ACTIVE' : 'INACTIVE',
        updatedBy: session.user.id
      }

      if (printerId === 'fiscal') {
        updateData.serialPort = config.port
      } else if (printerId === 'kitchen') {
        updateData.ipAddress = config.ip
        updateData.port = config.port
        updateData.timeout = config.timeout
      }

      updatedPrinter = await prisma.printer.update({
        where: { id: existingPrinter.id },
        data: updateData
      })
    } else {
      // Crear nueva impresora si no existe
      const createData: {
        name: string
        type: PrinterType
        connectionType: PrinterConnectionType
        status: PrinterStatus
        isDefault: boolean
        createdBy: string
        charactersPerLine: number
        paperWidth: number
        serialPort?: string
        timeout?: number
        ipAddress?: string
        port?: number
      } = {
        name: config.name,
        type: printerType as PrinterType,
        connectionType: printerId === 'fiscal' ? 'BLUETOOTH' : 'NETWORK',
        status: config.enabled ? 'ACTIVE' : 'INACTIVE',
        isDefault: true,
        createdBy: session.user.id,
        charactersPerLine: 32,
        paperWidth: 58
      }

      if (printerId === 'fiscal') {
        createData.serialPort = config.port
        createData.timeout = 10000
      } else if (printerId === 'kitchen') {
        createData.ipAddress = config.ip
        createData.port = config.port
        createData.timeout = config.timeout || 5000
      }

      updatedPrinter = await prisma.printer.create({
        data: createData
      })
    }

    console.log(`✅ Configuración actualizada para impresora ${printerId}`)

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      config: formatPrinterForAPI(updatedPrinter as any)
    })
  } catch (error) {
    console.error('Error actualizando configuración de impresora:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
