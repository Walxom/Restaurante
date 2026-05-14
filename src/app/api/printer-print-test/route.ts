import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createConnection } from 'net'
import { SerialPort } from 'serialport'

// Función para obtener la configuración actual de las impresoras
async function getPrinterConfig() {
  try {
    // Primero intentar obtener de la base de datos directamente
    const { PrinterConfigService } = await import('@/services/printer/printer-config')
    
    const kitchenPrinter = await PrinterConfigService.getKitchenPrinter()
    const fiscalPrinter = await PrinterConfigService.getPrinterByType('FISCAL')
    
    return {
      fiscal: fiscalPrinter ? {
        port: fiscalPrinter.serialPort || process.env.FISCAL_PRINTER_PORT || 'COM7',
        baudRate: 115200
      } : {
        port: process.env.FISCAL_PRINTER_PORT || 'COM7',
        baudRate: parseInt(process.env.FISCAL_PRINTER_BAUD_RATE || '115200')
      },
      kitchen: kitchenPrinter && kitchenPrinter.ipAddress ? {
        ip: kitchenPrinter.ipAddress,
        port: kitchenPrinter.port || 9100
      } : {
        ip: process.env.KITCHEN_PRINTER_IP || '192.168.0.150',
        port: parseInt(process.env.KITCHEN_PRINTER_PORT || '9100')
      }
    }
  } catch (error) {
    console.log('⚠️ No se pudo obtener configuración de impresoras desde BD, usando valores por defecto:', error)
    
    // Valores por defecto actualizados
    return {
      fiscal: {
        port: process.env.FISCAL_PRINTER_PORT || 'COM7',
        baudRate: parseInt(process.env.FISCAL_PRINTER_BAUD_RATE || '115200')
      },
      kitchen: {
        ip: process.env.KITCHEN_PRINTER_IP || '192.168.0.150',
        port: parseInt(process.env.KITCHEN_PRINTER_PORT || '9100')
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { printerId, ip, port, fiscalPort, baudRate } = await request.json()

    // Obtener la configuración actual de las impresoras
    const printerConfig = await getPrinterConfig()

    console.log(`🖨️ Intentando imprimir ticket de prueba en ${printerId}`)

    if (printerId === 'kitchen') {
      // Usar la configuración enviada desde el frontend o la configuración guardada
      const kitchenIp = ip || printerConfig.kitchen.ip
      const kitchenPort = port || printerConfig.kitchen.port
      console.log(`🍳 Configuración cocina: ${kitchenIp}:${kitchenPort}`)
      return await testKitchenPrint(kitchenIp, kitchenPort)
    } else if (printerId === 'fiscal') {
      // Usar la configuración enviada desde el frontend o la configuración guardada
      const fiscalConfig = {
        port: fiscalPort || printerConfig.fiscal.port,
        baudRate: baudRate || printerConfig.fiscal.baudRate
      }
      console.log(`🧾 Configuración fiscal: ${fiscalConfig.port} @ ${fiscalConfig.baudRate}`)
      return await testFiscalPrint(fiscalConfig)
    } else {
      return NextResponse.json(
        { error: 'ID de impresora no válido' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('❌ Error en prueba de impresión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function testKitchenPrint(ip: string, port: number): Promise<NextResponse> {
  return new Promise((resolve) => {
    console.log(`🍳 Conectando a impresora de cocina: ${ip}:${port}`)
    
    const socket = createConnection({
      host: ip,
      port: port,
      timeout: 10000  // 10 segundos timeout
    })

    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout en conexión con impresora de cocina`)
      socket.destroy()
      resolve(NextResponse.json(
        { 
          success: false, 
          error: 'Timeout de conexión. La impresora no responde.',
          details: 'No se pudo establecer conexión en 10 segundos'
        },
        { status: 400 }
      ))
    }, 10000)

    socket.on('connect', () => {
      clearTimeout(timeoutId)
      console.log(`✅ Conectado a impresora de cocina, enviando ticket de prueba...`)
      
      // Crear ticket de prueba
      const testTicket = createTestKitchenTicket()
      
      socket.write(testTicket, (writeError) => {
        socket.destroy()
        
        if (writeError) {
          console.log(`❌ Error al escribir en impresora: ${writeError.message}`)
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Error al enviar datos a la impresora',
              details: writeError.message
            },
            { status: 400 }
          ))
        } else {
          console.log(`✅ Ticket de prueba enviado exitosamente`)
          resolve(NextResponse.json({
            success: true,
            message: 'Ticket de prueba enviado. Verifica que se haya impreso.',
            printerId: 'kitchen'
          }))
        }
      })
    })

    socket.on('error', (error: Error & { code?: string }) => {
      clearTimeout(timeoutId)
      console.log(`❌ Error de conexión: ${error.code} - ${error.message}`)
      
      let errorMessage = 'Error de conexión'
      let details = error.message
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Conexión rechazada'
        details = 'La impresora no acepta conexiones. Verifica que esté encendida y conectada a la red.'
      } else if (error.code === 'ENETUNREACH') {
        errorMessage = 'Red no alcanzable'
        details = 'No se puede alcanzar la IP de la impresora. Verifica la configuración de red.'
      } else if (error.code === 'EHOSTUNREACH') {
        errorMessage = 'Host no alcanzable'
        details = 'La IP de la impresora no está disponible en la red.'
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout de conexión'
        details = 'La impresora no responde. Puede estar apagada o tener problemas de red.'
      }
      
      resolve(NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: details,
          errorCode: error.code
        },
        { status: 400 }
      ))
    })
  })
}

async function testFiscalPrint(fiscalConfig: { port: string; baudRate: number }): Promise<NextResponse> {
  try {
    console.log(`🧾 Probando impresora fiscal en puerto ${fiscalConfig.port} con baudRate ${fiscalConfig.baudRate}...`)
    
    return new Promise((resolve) => {
      try {
        const port = new SerialPort({
          path: fiscalConfig.port,
          baudRate: fiscalConfig.baudRate,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          flowControl: false
        })

        port.on('open', () => {
          console.log(`✅ Puerto serial ${fiscalConfig.port} abierto`)
          
          // Crear ticket de prueba simple
          const testCommands = Buffer.concat([
            Buffer.from([0x1B, 0x40]), // Reset ESC @
            Buffer.from([0x1B, 0x61, 0x01]), // Center align
            Buffer.from('PRUEBA DE IMPRESORA\n', 'latin1'),
            Buffer.from([0x1B, 0x61, 0x00]), // Left align
            Buffer.from('========================\n', 'latin1'),
            Buffer.from('IMPRESORA: FISCAL\n', 'latin1'),
            Buffer.from(`PUERTO: ${fiscalConfig.port}\n`, 'latin1'),
            Buffer.from(`BAUD RATE: ${fiscalConfig.baudRate}\n`, 'latin1'),
            Buffer.from('FECHA: ' + new Date().toLocaleDateString() + '\n', 'latin1'),
            Buffer.from('HORA: ' + new Date().toLocaleTimeString() + '\n', 'latin1'),
            Buffer.from('ESTADO: FUNCIONANDO\n', 'latin1'),
            Buffer.from('\nSi ve este mensaje,\n', 'latin1'),
            Buffer.from('la impresora esta\n', 'latin1'),
            Buffer.from('funcionando correctamente.\n', 'latin1'),
            Buffer.from('\n========================\n\n', 'latin1'), // Más espacios
            Buffer.from([0x1D, 0x56, 0x00]) // Cut paper
          ])

          port.write(testCommands, (writeError: Error | null | undefined) => {
            port.close()
            
            if (writeError) {
              console.log(`❌ Error al escribir en puerto serial: ${writeError.message}`)
              resolve(NextResponse.json(
                { 
                  success: false, 
                  error: 'Error al enviar datos a la impresora',
                  details: writeError.message
                },
                { status: 400 }
              ))
            } else {
              console.log(`✅ Ticket de prueba enviado a impresora fiscal`)
              resolve(NextResponse.json({
                success: true,
                message: 'Ticket de prueba enviado a impresora fiscal. Verifica que se haya impreso.',
                printerId: 'fiscal'
              }))
            }
          })
        })

        port.on('error', (error: Error) => {
          console.log(`❌ Error en puerto serial: ${error.message}`)
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Error al conectar con la impresora fiscal',
              details: error.message
            },
            { status: 400 }
          ))
        })

        // Timeout de 10 segundos
        setTimeout(() => {
          if (port.isOpen) {
            port.close()
          }
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Timeout de conexión con impresora fiscal'
            },
            { status: 400 }
          ))
        }, 10000)

      } catch (error) {
        console.log(`❌ Error al inicializar puerto serial:`, error)
        resolve(NextResponse.json(
          { 
            success: false, 
            error: 'Error al inicializar puerto serial',
            details: error instanceof Error ? error.message : 'Error desconocido'
          },
          { status: 500 }
        ))
      }
    })

  } catch (error) {
    console.log(`❌ Error en prueba de impresora fiscal:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al probar la impresora fiscal',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

function createTestKitchenTicket(): Buffer {
  // Comandos ESC/POS para ticket de prueba
  const commands: number[] = []
  
  // Inicializar impresora
  commands.push(0x1B, 0x40) // ESC @
  
  // Centrar texto
  commands.push(0x1B, 0x61, 0x01) // ESC a 1
  
  // Texto en negrita
  commands.push(0x1B, 0x45, 0x01) // ESC E 1
  
  // Título
  const title = "PRUEBA DE IMPRESORA\n"
  commands.push(...Array.from(Buffer.from(title, 'utf8')))
  
  // Quitar negrita
  commands.push(0x1B, 0x45, 0x00) // ESC E 0
  
  // Línea separadora
  commands.push(...Array.from(Buffer.from("========================\n", 'utf8')))
  
  // Alinear a la izquierda
  commands.push(0x1B, 0x61, 0x00) // ESC a 0
  
  // Información de prueba
  const info = [
    "IMPRESORA: COCINA",
    "FECHA: " + new Date().toLocaleDateString(),
    "HORA: " + new Date().toLocaleTimeString(),
    "ESTADO: FUNCIONANDO\n",
    "Si ve este mensaje,",
    "la impresora esta",
    "funcionando correctamente.\n",
    "========================",
    "\n\n"
  ]
  
  info.forEach(line => {
    commands.push(...Array.from(Buffer.from(line + "\n", 'utf8')))
  })
  
  // Agregar espaciado adicional antes del corte
  commands.push(...Array.from(Buffer.from("\n\n\n\n", 'utf8')))
  
  // Cortar papel
  commands.push(0x1D, 0x56, 0x00) // GS V 0
  
  return Buffer.from(commands)
}
