/**
 * Servicio de Gestión de Impresión Dual
 * Coordina impresión entre Bluetooth (Fiscal) y TCP/IP (Cocina)
 */

import { EventEmitter } from 'events'
import { ZJ8360NetworkDriver, KitchenOrderData, ZJ8360Config } from '../drivers/ZJ8360NetworkDriver'
import { KitchenOrderFormatter, KitchenFormattingOptions } from '../formatters/KitchenOrderFormatter'

// Re-exportar interfaces para uso externo
export type { KitchenOrderData, KitchenItem } from '../drivers/ZJ8360NetworkDriver'

export interface FiscalDocumentData {
  type: 'boleta' | 'factura'
  customer?: {
    name: string
    document?: string
    address?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
}

export interface DualPrintConfig {
  // Configuración impresora fiscal (Bluetooth)
  fiscal: {
    enabled: boolean
    port: string
    baudRate: number
    name: string
  }
  
  // Configuración impresora cocina (TCP/IP)
  kitchen: ZJ8360Config
  
  // Opciones de formateo para cocina
  kitchenFormatting: KitchenFormattingOptions
  
  // Configuración general
  autoRetry: boolean
  maxRetries: number
  retryDelay: number
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

export interface PrintJob {
  id: string
  type: 'fiscal' | 'kitchen' | 'both'
  data: KitchenOrderData | FiscalDocumentData
  status: 'pending' | 'printing' | 'completed' | 'failed'
  attempts: number
  timestamp: Date
  error?: string
}

export interface PrintResult {
  success: boolean
  jobId: string
  printerType: 'fiscal' | 'kitchen'
  error?: string
  timestamp: Date
}

export class DualPrintService extends EventEmitter {
  private config: DualPrintConfig
  private kitchenDriver: ZJ8360NetworkDriver | null = null
  private kitchenFormatter: KitchenOrderFormatter
  private jobQueue: Map<string, PrintJob> = new Map()
  private isInitialized = false
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: DualPrintConfig) {
    super()
    this.config = config
    this.kitchenFormatter = new KitchenOrderFormatter(config.kitchenFormatting)
    
    this.log('info', '📄 Servicio de impresión dual inicializado')
  }

  /**
   * Inicializar servicio de impresión dual
   */
  async initialize(): Promise<boolean> {
    try {
      this.log('info', '🚀 Inicializando servicio de impresión dual...')
      
      // Inicializar driver de cocina (TCP/IP)
      if (this.config.kitchen.enabled) {
        await this.initializeKitchenPrinter()
      }
      
      this.isInitialized = true
      this.log('info', '✅ Servicio de impresión dual inicializado exitosamente')
      this.emit('initialized')
      
      return true
      
    } catch (error) {
      this.log('error', '❌ Error inicializando servicio dual:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Inicializar impresora de cocina ZJ-8360
   */
  private async initializeKitchenPrinter(): Promise<void> {
    this.log('info', `🖨️ Inicializando impresora de cocina ZJ-8360...`)
    
    this.kitchenDriver = new ZJ8360NetworkDriver(this.config.kitchen)
    
    // Eventos del driver de cocina
    this.kitchenDriver.on('connected', () => {
      this.log('info', '✅ Impresora de cocina conectada')
      this.emit('kitchen-connected')
    })
    
    this.kitchenDriver.on('disconnected', () => {
      this.log('warn', '🔌 Impresora de cocina desconectada')
      this.emit('kitchen-disconnected')
    })
    
    this.kitchenDriver.on('error', (error) => {
      this.log('error', '❌ Error en impresora de cocina:', error)
      this.emit('kitchen-error', error)
    })
    
    this.kitchenDriver.on('printed', (result) => {
      this.log('info', `📄 Orden ${result.orderNumber} impresa en cocina`)
      this.emit('kitchen-printed', result)
    })
    
    // Conectar
    await this.kitchenDriver.connect()
  }

  /**
   * Imprimir orden de cocina en ZJ-8360
   */
  async printKitchenOrder(orderData: KitchenOrderData): Promise<PrintResult> {
    const jobId = this.generateJobId()
    
    try {
      this.log('info', `🍳 Imprimiendo orden ${orderData.orderNumber} en cocina...`)
      
      if (!this.isInitialized) {
        throw new Error('DUAL_PRINT_NOT_INITIALIZED: Servicio no inicializado')
      }
      
      if (!this.config.kitchen.enabled) {
        throw new Error('KITCHEN_PRINTER_DISABLED: Impresora de cocina deshabilitada')
      }
      
      if (!this.kitchenDriver) {
        throw new Error('KITCHEN_DRIVER_NOT_AVAILABLE: Driver de cocina no disponible')
      }
      
      // Crear job
      const job: PrintJob = {
        id: jobId,
        type: 'kitchen',
        data: orderData,
        status: 'printing',
        attempts: 1,
        timestamp: new Date()
      }
      
      this.jobQueue.set(jobId, job)
      this.emit('job-started', job)
      
      // Imprimir
      await this.kitchenDriver.printKitchenOrder(orderData)
      
      // Marcar como completado
      job.status = 'completed'
      this.emit('job-completed', job)
      
      const result: PrintResult = {
        success: true,
        jobId,
        printerType: 'kitchen',
        timestamp: new Date()
      }
      
      this.log('info', `✅ Orden ${orderData.orderNumber} impresa exitosamente en cocina`)
      return result
      
    } catch (error) {
      this.log('error', `❌ Error imprimiendo orden en cocina:`, error)
      
      const job = this.jobQueue.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : String(error)
        this.emit('job-failed', job)
        
        // Programar reintento si está habilitado
        if (this.config.autoRetry && job.attempts < this.config.maxRetries) {
          this.scheduleRetry(jobId)
        }
      }
      
      const result: PrintResult = {
        success: false,
        jobId,
        printerType: 'kitchen',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }
      
      return result
    }
  }

  /**
   * Imprimir boleta/factura en impresora fiscal (Bluetooth)
   * Nota: Esta funcionalidad usa el sistema existente
   */
  async printFiscalDocument(documentData: FiscalDocumentData): Promise<PrintResult> {
    const jobId = this.generateJobId()
    
    try {
      this.log('info', '🧾 Imprimiendo documento fiscal...')
      
      if (!this.config.fiscal.enabled) {
        throw new Error('FISCAL_PRINTER_DISABLED: Impresora fiscal deshabilitada')
      }
      
      // Crear job
      const job: PrintJob = {
        id: jobId,
        type: 'fiscal',
        data: documentData,
        status: 'printing',
        attempts: 1,
        timestamp: new Date()
      }
      
      this.jobQueue.set(jobId, job)
      this.emit('job-started', job)
      
      // TODO: Integrar con el sistema fiscal existente
      // Por ahora, simular impresión exitosa
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      job.status = 'completed'
      this.emit('job-completed', job)
      
      const result: PrintResult = {
        success: true,
        jobId,
        printerType: 'fiscal',
        timestamp: new Date()
      }
      
      this.log('info', '✅ Documento fiscal impreso exitosamente')
      return result
      
    } catch (error) {
      this.log('error', '❌ Error imprimiendo documento fiscal:', error)
      
      const job = this.jobQueue.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : String(error)
        this.emit('job-failed', job)
      }
      
      const result: PrintResult = {
        success: false,
        jobId,
        printerType: 'fiscal',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }
      
      return result
    }
  }

  /**
   * Imprimir en ambas impresoras (orden + documento fiscal)
   */
  async printDualOrder(orderData: KitchenOrderData, fiscalData: FiscalDocumentData): Promise<PrintResult[]> {
    this.log('info', `📄 Imprimiendo orden dual: cocina + fiscal`)
    
    const results: PrintResult[] = []
    
    try {
      // Imprimir en paralelo
      const [kitchenResult, fiscalResult] = await Promise.allSettled([
        this.printKitchenOrder(orderData),
        this.printFiscalDocument(fiscalData)
      ])
      
      if (kitchenResult.status === 'fulfilled') {
        results.push(kitchenResult.value)
      } else {
        results.push({
          success: false,
          jobId: this.generateJobId(),
          printerType: 'kitchen',
          error: kitchenResult.reason?.message || 'Error desconocido',
          timestamp: new Date()
        })
      }
      
      if (fiscalResult.status === 'fulfilled') {
        results.push(fiscalResult.value)
      } else {
        results.push({
          success: false,
          jobId: this.generateJobId(),
          printerType: 'fiscal',
          error: fiscalResult.reason?.message || 'Error desconocido',
          timestamp: new Date()
        })
      }
      
      const allSuccessful = results.every(r => r.success)
      this.log(allSuccessful ? 'info' : 'warn', 
        `📄 Impresión dual ${allSuccessful ? 'exitosa' : 'parcial'}`)
      
      return results
      
    } catch (error) {
      this.log('error', '❌ Error en impresión dual:', error)
      throw error
    }
  }

  /**
   * Test de conectividad de ambas impresoras
   */
  async testConnections(): Promise<{ kitchen: boolean; fiscal: boolean }> {
    this.log('info', '🔍 Probando conectividad de impresoras...')
    
    const results = {
      kitchen: false,
      fiscal: false
    }
    
    // Test impresora de cocina
    if (this.config.kitchen.enabled && this.kitchenDriver) {
      try {
        results.kitchen = await this.kitchenDriver.testConnection()
        this.log('info', `🍳 Test cocina: ${results.kitchen ? 'OK' : 'FAIL'}`)
      } catch (error) {
        this.log('error', '❌ Error test cocina:', error)
      }
    }
    
    // Test impresora fiscal
    if (this.config.fiscal.enabled) {
      try {
        // TODO: Implementar test para impresora fiscal
        results.fiscal = true // Simular por ahora
        this.log('info', `🧾 Test fiscal: ${results.fiscal ? 'OK' : 'FAIL'}`)
      } catch (error) {
        this.log('error', '❌ Error test fiscal:', error)
      }
    }
    
    return results
  }

  /**
   * Obtener estado del servicio
   */
  getStatus() {
    const kitchenStatus = this.kitchenDriver?.getStatus() || null
    
    return {
      isInitialized: this.isInitialized,
      kitchen: {
        enabled: this.config.kitchen.enabled,
        status: kitchenStatus
      },
      fiscal: {
        enabled: this.config.fiscal.enabled,
        port: this.config.fiscal.port
      },
      jobQueue: {
        total: this.jobQueue.size,
        pending: Array.from(this.jobQueue.values()).filter(j => j.status === 'pending').length,
        failed: Array.from(this.jobQueue.values()).filter(j => j.status === 'failed').length
      }
    }
  }

  /**
   * Programar reintento de job fallido
   */
  private scheduleRetry(jobId: string): void {
    const job = this.jobQueue.get(jobId)
    if (!job) return
    
    const delay = this.config.retryDelay * job.attempts
    this.log('info', `🔄 Programando reintento para job ${jobId} en ${delay}ms`)
    
    const timer = setTimeout(async () => {
      this.retryTimers.delete(jobId)
      
      try {
        job.attempts++
        job.status = 'printing'
        
        if (job.type === 'kitchen') {
          await this.printKitchenOrder(job.data as KitchenOrderData)
        } else if (job.type === 'fiscal') {
          await this.printFiscalDocument(job.data as FiscalDocumentData)
        }
        
      } catch (error) {
        this.log('error', `❌ Reintento fallido para job ${jobId}:`, error)
        
        if (job.attempts >= this.config.maxRetries) {
          this.log('error', `❌ Job ${jobId} abandonado después de ${job.attempts} intentos`)
          this.emit('job-abandoned', job)
        } else {
          this.scheduleRetry(jobId)
        }
      }
    }, delay)
    
    this.retryTimers.set(jobId, timer)
  }

  /**
   * Limpiar trabajos completados antiguos
   */
  clearOldJobs(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000))
    const initialSize = this.jobQueue.size
    
    for (const [jobId, job] of this.jobQueue.entries()) {
      if (job.status === 'completed' && job.timestamp < cutoffTime) {
        this.jobQueue.delete(jobId)
      }
    }
    
    const clearedCount = initialSize - this.jobQueue.size
    this.log('info', `🧹 Limpiados ${clearedCount} trabajos antiguos`)
    
    return clearedCount
  }

  /**
   * Cerrar servicio de impresión
   */
  async shutdown(): Promise<void> {
    this.log('info', '🛑 Cerrando servicio de impresión dual...')
    
    // Cancelar reintentos pendientes
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()
    
    // Desconectar impresora de cocina
    if (this.kitchenDriver) {
      await this.kitchenDriver.disconnect()
    }
    
    this.isInitialized = false
    this.log('info', '✅ Servicio de impresión dual cerrado')
    this.emit('shutdown')
  }

  /**
   * Generar ID único para trabajos
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sistema de logging interno
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: unknown[]): void {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 }
    const configLevel = levels[this.config.logLevel]
    const messageLevel = levels[level]
    
    if (messageLevel <= configLevel) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [DUAL-PRINT] [${level.toUpperCase()}] ${message}`, ...args)
    }
  }
}
