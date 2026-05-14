/**
 * Driver TCP/IP para Impresora ZJ-8360 (Cocina)
 * Implementación específica para red TCP/IP en puerto 9100
 */

import * as net from 'net'
import { EventEmitter } from 'events'

export interface ZJ8360Config {
  ip: string
  port: number
  timeout: number
  name: string
  enabled: boolean
  keepAlive: boolean
  noDelay: boolean
  reconnectInterval: number
}

export interface KitchenOrderData {
  orderNumber: string
  tableNumber?: string
  waiterName?: string
  customerName?: string
  items: KitchenItem[]
  notes?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: Date
}

export interface KitchenItem {
  name: string
  quantity: number
  modifications?: string[]
  cookingInstructions?: string
  allergyWarnings?: string[]
}

export class ZJ8360NetworkDriver extends EventEmitter {
  private socket: net.Socket | null = null
  private isConnected = false
  private config: ZJ8360Config
  private reconnectTimer: NodeJS.Timeout | null = null
  private lastError: string | null = null
  private connectionAttempts = 0
  private maxConnectionAttempts = 5

  // Comandos ESC/POS específicos para ZJ-8360
  private readonly commands = {
    // Inicialización
    INIT: Buffer.from([0x1B, 0x40]), // ESC @
    
    // Alineación
    ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
    
    // Estilos
    BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
    UNDERLINE_ON: Buffer.from([0x1B, 0x2D, 0x01]),
    UNDERLINE_OFF: Buffer.from([0x1B, 0x2D, 0x00]),
    
    // Tamaños
    SIZE_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
    SIZE_DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x10]),
    SIZE_DOUBLE_WIDTH: Buffer.from([0x1D, 0x21, 0x20]),
    SIZE_DOUBLE_BOTH: Buffer.from([0x1D, 0x21, 0x30]),
    
    // Control de papel
    LINE_FEED: Buffer.from([0x0A]),
    FEED_LINES: (n: number) => Buffer.from([0x1B, 0x64, n]),
    
    // Corte optimizado para ZJ-8360 (un solo comando)
    CUT_PAPER: Buffer.from([0x1D, 0x56, 0x41, 0x03]), // GS V A - feed + corte automático
    
    // Beep (notificación para cocina)
    BEEP: Buffer.from([0x1B, 0x42, 0x03, 0x0A]) // 3 beeps
  }

  constructor(config: ZJ8360Config) {
    super()
    this.config = config
    console.log(`🖨️ Driver ZJ-8360 inicializado para ${config.ip}:${config.port}`)
  }

  /**
   * Conectar a la impresora ZJ-8360 vía TCP/IP
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.socket) {
      console.log(`✅ ZJ-8360 ya está conectada`)
      return true
    }

    return new Promise((resolve, reject) => {
      console.log(`🔌 Conectando a ZJ-8360 en ${this.config.ip}:${this.config.port}...`)
      
      this.socket = new net.Socket()
      
      // Configurar socket
      this.socket.setKeepAlive(this.config.keepAlive, 1000)
      this.socket.setNoDelay(this.config.noDelay)
      
      const timeout = setTimeout(() => {
        this.lastError = 'TIMEOUT_CONNECTION'
        this.socket?.destroy()
        console.error(`❌ Timeout conectando a ZJ-8360`)
        reject(new Error('TIMEOUT_CONNECTION: La impresora ZJ-8360 no responde'))
      }, this.config.timeout)

      this.socket.on('connect', () => {
        clearTimeout(timeout)
        this.isConnected = true
        this.connectionAttempts = 0
        this.lastError = null
        
        console.log(`✅ ZJ-8360 conectada exitosamente`)
        this.emit('connected')
        resolve(true)
      })

      this.socket.on('error', (error) => {
        clearTimeout(timeout)
        this.isConnected = false
        this.lastError = this.categorizeNetworkError(error)
        
        console.error(`❌ Error de conexión ZJ-8360:`, error.message)
        this.emit('error', error)
        reject(error)
      })

      this.socket.on('close', () => {
        this.isConnected = false
        console.log(`🔌 Conexión ZJ-8360 cerrada`)
        this.emit('disconnected')
        
        // Auto-reconectar si está habilitado
        if (this.config.enabled && this.connectionAttempts < this.maxConnectionAttempts) {
          this.scheduleReconnect()
        }
      })

      this.socket.on('timeout', () => {
        console.warn(`⏰ Timeout en ZJ-8360`)
        this.socket?.destroy()
      })

      // Intentar conexión
      try {
        this.socket.connect(this.config.port, this.config.ip)
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  /**
   * Desconectar de la impresora
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket && this.isConnected) {
      return new Promise((resolve) => {
        this.socket!.once('close', () => {
          this.isConnected = false
          console.log(`🔌 ZJ-8360 desconectada`)
          resolve()
        })
        this.socket!.end()
      })
    }
  }

  /**
   * Enviar comando crudo a la impresora
   */
  async sendRawCommand(command: Buffer): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('PRINTER_DISCONNECTED: ZJ-8360 no está conectada')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SEND_TIMEOUT: Timeout enviando comando a ZJ-8360'))
      }, this.config.timeout)

      this.socket!.write(command, (error) => {
        clearTimeout(timeout)
        if (error) {
          this.lastError = 'SEND_ERROR'
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Imprimir orden de cocina específica para ZJ-8360
   */
  async printKitchenOrder(orderData: KitchenOrderData): Promise<void> {
    try {
      console.log(`🍳 Imprimiendo orden ${orderData.orderNumber} en ZJ-8360`)
      
      if (!this.isConnected) {
        await this.connect()
      }

      const commands = this.formatKitchenOrder(orderData)
      await this.sendRawCommand(commands)
      
      console.log(`✅ Orden ${orderData.orderNumber} impresa exitosamente en ZJ-8360`)
      this.emit('printed', { orderNumber: orderData.orderNumber, success: true })
      
    } catch (error) {
      console.error(`❌ Error imprimiendo orden en ZJ-8360:`, error)
      this.emit('printed', { orderNumber: orderData.orderNumber, success: false, error })
      throw error
    }
  }

  /**
   * Formatear orden de cocina para ZJ-8360
   */
  private formatKitchenOrder(orderData: KitchenOrderData): Buffer {
    const commands: Buffer[] = []
    
    // 1. Inicializar impresora
    commands.push(this.commands.INIT)
    commands.push(this.commands.SIZE_DOUBLE_BOTH)
    
    // 2. (Cabecera removida)
    
    // 3. Información de la orden
    commands.push(this.commands.ALIGN_LEFT)
    commands.push(Buffer.from(`Orden: #${orderData.orderNumber}\n`, 'utf8'))
    
    if (orderData.tableNumber) {
      commands.push(Buffer.from(`Mesa: ${orderData.tableNumber}\n`, 'utf8'))
    }
    
    if (orderData.waiterName) {
      commands.push(Buffer.from(`Mesero: ${orderData.waiterName}\n`, 'utf8'))
    }
    if (orderData.customerName) {
      commands.push(Buffer.from(`Cliente: ${orderData.customerName}\n`, 'utf8'))
    }
    
    commands.push(Buffer.from(`Hora: ${orderData.timestamp.toLocaleTimeString('es-PE', { hour12: false })}\n`, 'utf8'))
    commands.push(this.commands.BOLD_ON)
    commands.push(Buffer.from(`${'='.repeat(16)}\n`, 'utf8'))
    commands.push(this.commands.BOLD_OFF)
    
    // Prioridad visual
    if (orderData.priority === 'urgent') {
      commands.push(this.commands.BOLD_ON)
      commands.push(Buffer.from('⚠️ URGENTE ⚠️\n', 'utf8'))
      commands.push(this.commands.BOLD_OFF)
    }
    
    // Separador removido
    
    // 4. Items a preparar
    // Título y separadores removidos
    
    orderData.items.forEach((item, index) => {
      // Nombre del plato en negrita
      commands.push(this.commands.BOLD_ON)
      commands.push(Buffer.from(`${item.quantity}x ${item.name}\n`, 'utf8'))
      commands.push(this.commands.BOLD_OFF)
      
      // Modificaciones
      if (item.modifications && item.modifications.length > 0) {
        commands.push(Buffer.from(`  Mod: ${item.modifications.join(', ')}\n`, 'utf8'))
      }
      
      // Instrucciones de cocción
      if (item.cookingInstructions) {
        commands.push(Buffer.from(`  Prep: ${item.cookingInstructions}\n`, 'utf8'))
      }
      
      // Alergias (destacado)
      if (item.allergyWarnings && item.allergyWarnings.length > 0) {
        commands.push(this.commands.BOLD_ON)
        commands.push(Buffer.from(`  ⚠️ ALERGIA: ${item.allergyWarnings.join(', ')}\n`, 'utf8'))
        commands.push(this.commands.BOLD_OFF)
      }
      
      // Separador entre items
      if (index < orderData.items.length - 1) {
        commands.push(this.commands.LINE_FEED)
      }
    })
    
    // 5. Notas adicionales
    if (orderData.notes) {
      commands.push(Buffer.from('='.repeat(32) + '\n', 'utf8'))
      commands.push(this.commands.BOLD_ON)
      commands.push(Buffer.from('NOTAS ESPECIALES:\n', 'utf8'))
      commands.push(this.commands.BOLD_OFF)
      commands.push(Buffer.from(`${orderData.notes}\n`, 'utf8'))
    }
    
    // 6. QR Code para tracking (opcional)
    commands.push(this.commands.ALIGN_CENTER)
    commands.push(this.generateQRCode(`ORDER:${orderData.orderNumber}`))
    
    // 7. Footer
    commands.push(this.commands.LINE_FEED)
    commands.push(Buffer.from(`Mr. Frit - ${new Date().toLocaleDateString('es-PE')}\n`, 'utf8'))
    
    // 8. Espaciado final y corte
    commands.push(this.commands.FEED_LINES(3))
    commands.push(this.commands.CUT_PAPER)
    
    // 9. Beep de notificación
    commands.push(this.commands.BEEP)
    
    return Buffer.concat(commands)
  }

  /**
   * Generar QR Code para tracking de órdenes
   */
  private generateQRCode(data: string): Buffer {
    const qrData = Buffer.from(data, 'utf8')
    const dataLength = qrData.length
    
    return Buffer.concat([
      // Configurar QR (versión automática, corrección M)
      Buffer.from([0x1B, 0x5A, 0x00, 0x02, 0x08]),
      // Longitud de datos
      Buffer.from([dataLength]),
      // Datos
      qrData,
      this.commands.LINE_FEED
    ])
  }

  /**
   * Test de conexión básico
   */
  async testConnection(): Promise<boolean> {
    try {
      const connected = await this.connect()
      if (!connected) return false
      
      const testCommand = Buffer.concat([
        this.commands.INIT,
        this.commands.ALIGN_CENTER,
        this.commands.BOLD_ON,
        Buffer.from('TEST ZJ-8360\n', 'utf8'),
        this.commands.BOLD_OFF,
        Buffer.from(`${new Date().toLocaleString()}\n`, 'utf8'),
        this.commands.FEED_LINES(2),
        this.commands.CUT_PAPER
      ])
      
      await this.sendRawCommand(testCommand)
      console.log(`✅ Test de ZJ-8360 exitoso`)
      return true
      
    } catch (error) {
      console.error(`❌ Test de ZJ-8360 falló:`, error)
      return false
    }
  }

  /**
   * Categorizar errores de red específicos
   */
  private categorizeNetworkError(error: NodeJS.ErrnoException): string {
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED'
    if (error.code === 'EHOSTUNREACH') return 'HOST_UNREACHABLE'
    if (error.code === 'ENETUNREACH') return 'NETWORK_UNREACHABLE'
    if (error.code === 'ETIMEDOUT') return 'NETWORK_TIMEOUT'
    if (error.code === 'ENOTFOUND') return 'HOST_NOT_FOUND'
    return 'UNKNOWN_NETWORK_ERROR'
  }

  /**
   * Programar reconexión automática
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    this.connectionAttempts++
    const delay = Math.min(this.config.reconnectInterval * this.connectionAttempts, 30000)
    
    console.log(`🔄 Reconectando ZJ-8360 en ${delay}ms (intento ${this.connectionAttempts}/${this.maxConnectionAttempts})`)
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (error) {
        console.error(`❌ Fallo reconexión ZJ-8360:`, error)
      }
    }, delay)
  }

  /**
   * Obtener estado de la conexión
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      lastError: this.lastError,
      connectionAttempts: this.connectionAttempts,
      config: {
        ip: this.config.ip,
        port: this.config.port,
        name: this.config.name,
        enabled: this.config.enabled
      }
    }
  }
}
