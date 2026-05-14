/**
 * Servicio de Cola de Impresión Térmica del Servidor
 * Maneja todos los trabajos de impresión de forma centralizada
 * 
 * IMPORTANTE: La configuración de impresoras se obtiene desde la base de datos
 * utilizando el modelo Printer. Ya no depende de variables de entorno.
 */

import { EventEmitter } from 'events'
import { prisma } from '@/lib/prisma'

// Declaración de tipos para el estado global
declare global {
  var thermalPrintState: {
    isRunning: boolean
    startedAt: Date | null
    processedJobs: number
    failedJobs: number
    activeInterval: NodeJS.Timeout | null
    printerStatus: 'disconnected' | 'connected' | 'busy' | 'error'
  }
}

// Estado global para mantener consistencia entre instancias en desarrollo
// Usar el objeto global de Node.js para persistir entre hot reloads
if (!global.thermalPrintState) {
  global.thermalPrintState = {
    isRunning: false,
    startedAt: null as Date | null,
    processedJobs: 0,
    failedJobs: 0,
    activeInterval: null as NodeJS.Timeout | null,
    printerStatus: 'disconnected' as 'disconnected' | 'connected' | 'busy' | 'error'
  }
}

const globalState = global.thermalPrintState

export interface PrintJobRequest {
  orderId: string
  orderNumber: string
  documentType: 'BOLETA' | 'FACTURA'
  content: string
  requestedBy: {
    id: string
    name: string
    role: string
  }
  metadata?: {
    customerName?: string
    table?: string
    total?: number
    itemCount?: number
  }
}

export interface PrintJob extends PrintJobRequest {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error?: string
  errorCode?: string // Nuevo campo para tipo de error específico
  userMessage?: string // Nuevo campo para mensaje amigable al usuario
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  retryCount: number
  priority: number
}

export interface QueueStatus {
  length: number
  processing: number
  completed: number
  failed: number
  estimatedWaitTime: number
  printerStatus: 'disconnected' | 'connected' | 'busy' | 'error'
  recentJobs: PrintJob[]
}

export class ThermalPrintQueue extends EventEmitter {
  private static instance: ThermalPrintQueue
  private queue: PrintJob[] = []
  private completedJobs: PrintJob[] = []
  private isProcessing = false
  private printerStatus: 'disconnected' | 'connected' | 'busy' | 'error' = 'disconnected'
  private currentJob: PrintJob | null = null
  private serviceStartedAt: Date | null = null
  private processingInterval: NodeJS.Timeout | null = null
  private jobCounter = 0
  private maxRetries = 3
  private maxCompletedJobs = 100
  private processingTimeEstimate = 5000 // 5 segundos por trabajo
  private stats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0
  }

  // Configuración de la impresora (se carga desde base de datos)
  private printerConfig = {
    port: 'COM7', // Default, se actualiza desde DB
    baudRate: 115200, // Default, se actualiza desde DB
    timeout: 30000,
    retryDelay: 2000,
    name: 'Impresora Térmica',
    enabled: true
  }

  private constructor() {
    super()
    // Nueva instancia de ThermalPrintQueue creada
    // No inicializar la impresora automáticamente para evitar conflictos
    // La inicialización se manejará cuando se inicie el servicio con startProcessing()
  }

  static getInstance(): ThermalPrintQueue {
    if (!ThermalPrintQueue.instance) {
      ThermalPrintQueue.instance = new ThermalPrintQueue()
    }
    return ThermalPrintQueue.instance
  }

  /**
   * Cargar configuración de impresora desde base de datos
   */
  private async loadPrinterConfig(): Promise<void> {
    try {
      console.log('📥 Cargando configuración de impresora desde base de datos...')
      
      // Buscar impresora fiscal o de comprobantes activa
      const printer = await prisma.printer.findFirst({
        where: {
          status: 'ACTIVE',
          type: {
            in: ['FISCAL', 'RECEIPT'] // Tipos válidos para impresión de comprobantes
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      if (printer) {
        // Determinar puerto según tipo de conexión
        let port = 'COM7' // Default
        
        if (printer.connectionType === 'SERIAL' && printer.serialPort) {
          port = printer.serialPort
        } else if (printer.connectionType === 'BLUETOOTH' && printer.bluetoothAddress) {
          // Para Bluetooth, usar el puerto serial configurado o default
          port = printer.serialPort || 'COM7'
        }

        this.printerConfig = {
          port: port,
          baudRate: 115200, // Valor estándar para impresoras térmicas
          timeout: printer.timeout || 30000,
          retryDelay: printer.reconnectDelay || 2000,
          name: printer.name || 'Impresora Térmica',
          enabled: printer.status === 'ACTIVE'
        }

        console.log(`✅ Configuración cargada: ${this.printerConfig.name} en ${this.printerConfig.port}`)
      } else {
        console.log('⚠️ No se encontró impresora fiscal/comprobantes activa en DB, usando valores por defecto')
      }
    } catch (error) {
      console.error('❌ Error cargando configuración de impresora:', error)
      // Mantener configuración por defecto
    }
  }

  /**
   * Inicializar conexión con impresora
   */
  private async initializePrinter(): Promise<void> {
    try {
      console.log('🖨️ Inicializando conexión con impresora térmica...')
      
      // Primero cargar configuración desde base de datos
      await this.loadPrinterConfig()
      
      // Verificar si la impresora está habilitada
      if (!this.printerConfig.enabled) {
        throw new Error('Impresora deshabilitada en configuración')
      }
      
      // En un entorno real, aquí establecerías la conexión serial
      // Por ahora simularemos la conexión
      await this.simulateConnection()
      
      this.printerStatus = 'connected'
      globalState.printerStatus = 'connected'
      console.log(`✅ Impresora térmica conectada: ${this.printerConfig.name} en ${this.printerConfig.port}`)
      
      this.emit('printerConnected')
      
    } catch (error) {
      console.error('❌ Error al conectar con impresora:', error)
      this.printerStatus = 'error'
      globalState.printerStatus = 'error'
      this.emit('printerError', error)
      
      // No reintentar automáticamente para evitar conflictos
      // El reintento se manejará manualmente cuando sea necesario
    }
  }

  /**
   * Simular conexión con impresora (reemplazar con implementación real)
   */
  private async simulateConnection(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular conexión exitosa siempre para evitar reinicios automáticos
        resolve()
      }, 100) // Reducido de 1000ms a 100ms para conexión más rápida
    })
  }

  /**
   * Agregar trabajo de impresión a la cola
   */
  async addPrintJob(request: PrintJobRequest): Promise<PrintJob> {
    const job: PrintJob = {
      ...request,
      id: `print_${Date.now()}_${++this.jobCounter}`,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      priority: this.calculatePriority(request)
    }

    // Insertar en la cola según prioridad
    this.insertByPriority(job)

    // Actualizar estadísticas
    this.stats.totalJobs++

    console.log(`📋 Trabajo agregado: ${job.orderNumber} (${job.documentType}) - Posición ${this.queue.findIndex(j => j.id === job.id) + 1}/${this.queue.length}`)

    this.emit('jobAdded', job)
    
    // Emitir evento Socket.IO para actualizaciones en tiempo real
    this.emitSocketEvent('thermal-print:job-added', {
      job: this.sanitizeJobForClient(job),
      queueStatus: this.getQueueStatus()
    })
    
    // Procesar inmediatamente si el servicio está ejecutándose
    if (globalState.isRunning && !this.isProcessing) {
      this.processQueue().catch(error => {
        console.error('Error procesando cola inmediatamente:', error)
      })
    }
    
    return job
  }

  /**
   * Calcular prioridad del trabajo
   */
  private calculatePriority(request: PrintJobRequest): number {
    let priority = 0
    
    // Prioridad por rol
    if (request.requestedBy.role === 'ADMIN') priority += 10
    if (request.requestedBy.role === 'MANAGER') priority += 5
    
    // Prioridad por tipo de documento
    if (request.documentType === 'FACTURA') priority += 3
    
    // Prioridad por monto (si está disponible)
    if (request.metadata?.total && request.metadata.total > 100) priority += 2
    
    return priority
  }

  /**
   * Insertar trabajo en la cola según prioridad
   */
  private insertByPriority(job: PrintJob): void {
    let inserted = false
    
    for (let i = 0; i < this.queue.length; i++) {
      if (job.priority > this.queue[i].priority) {
        this.queue.splice(i, 0, job)
        inserted = true
        break
      }
    }
    
    if (!inserted) {
      this.queue.push(job)
    }
  }



  /**
   * Procesar siguiente trabajo en la cola
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    const job = this.queue.shift()
    if (!job) return

    this.isProcessing = true
    this.currentJob = job
    this.printerStatus = 'busy'
    globalState.printerStatus = 'busy'

    try {
      job.status = 'processing'
      job.startedAt = new Date()
      job.progress = 0

      console.log(`🖨️ Procesando: ${job.orderNumber} (${job.documentType})`)

      this.emit('jobStarted', job)
      
      // Emitir evento Socket.IO
      this.emitSocketEvent('thermal-print:job-started', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })

      // Simular proceso de impresión con progreso
      await this.printDocument(job)

      job.status = 'completed'
      job.progress = 100
      job.completedAt = new Date()

      console.log(`✅ Trabajo completado: ${job.orderNumber} (${job.completedAt.getTime() - job.startedAt!.getTime()}ms)`)

      this.emit('jobCompleted', job)
      
      // Emitir evento Socket.IO
      this.emitSocketEvent('thermal-print:job-completed', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })

    } catch (error) {
      console.error(`❌ Error al procesar trabajo ${job.id}:`, error)
      
      job.retryCount++
      job.error = error instanceof Error ? error.message : 'Error desconocido'
      
      // Extraer código de error y mensaje de usuario si está disponible
      if (error instanceof Error && error.message.includes(':')) {
        const parts = error.message.split(':')
        job.errorCode = parts[0].trim()
        job.userMessage = parts.slice(1).join(':').trim()
      } else {
        job.errorCode = 'UNKNOWN_ERROR'
        job.userMessage = job.error
      }

      // Determinar si el error es recuperable
      const isRecoverableError = this.isRecoverableError(job.errorCode)

      if (job.retryCount < this.maxRetries && isRecoverableError) {
        job.status = 'pending'
        job.progress = 0
        
        // Reinsertar en la cola con menor prioridad
        job.priority = Math.max(0, job.priority - 1)
        this.insertByPriority(job)
        
        console.log(`🔄 Reintentando trabajo ${job.id} (intento ${job.retryCount}/${this.maxRetries}) - Error: ${job.errorCode}`)
        this.emit('jobRetry', job)
        
        // Emitir evento Socket.IO
        this.emitSocketEvent('thermal-print:job-retry', {
          job: this.sanitizeJobForClient(job),
          queueStatus: this.getQueueStatus()
        })
        
      } else {
        job.status = 'failed'
        job.completedAt = new Date()
        
        const reason = isRecoverableError ? 'máximo de reintentos alcanzado' : 'error no recuperable'
        console.log(`💥 Trabajo fallido definitivamente: ${job.id} (${reason})`)
        this.emit('jobFailed', job)
        
        // Emitir evento Socket.IO
        this.emitSocketEvent('thermal-print:job-failed', {
          job: this.sanitizeJobForClient(job),
          queueStatus: this.getQueueStatus()
        })
      }
    } finally {
      // Mover a trabajos completados
      this.completedJobs.unshift(job)
      
      // Mantener solo los últimos trabajos completados
      if (this.completedJobs.length > this.maxCompletedJobs) {
        this.completedJobs = this.completedJobs.slice(0, this.maxCompletedJobs)
      }

      this.currentJob = null
      this.isProcessing = false
      this.printerStatus = 'connected'
      globalState.printerStatus = 'connected'
    }
  }

  /**
   * Imprimir documento (implementación real)
   */
  private async printDocument(job: PrintJob): Promise<void> {
    try {
      // Actualizar progreso inicial
      job.progress = 10
      this.emit('jobProgress', job)
      this.emitSocketEvent('thermal-print:job-progress', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })

      // Simular impresión por ahora (este servicio está diseñado para boletas/facturas)
      job.progress = 50
      this.emit('jobProgress', job)
      
      // Simular tiempo de impresión
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      job.progress = 100
      this.emit('jobProgress', job)

      job.progress = 30
      this.emit('jobProgress', job)
      this.emitSocketEvent('thermal-print:job-progress', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })

      // Simular tiempo de impresión
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      job.progress = 100
      this.emit('jobProgress', job)
      this.emitSocketEvent('thermal-print:job-progress', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })

      console.log(`📄 Documento ${job.documentType} impreso exitosamente (${job.id})`)

    } catch (error) {
      console.error(`❌ Error imprimiendo documento:`, error)
      throw error
    }
  }

  /**
   * Determinar si un error es recuperable (se puede reintentar)
   */
  private isRecoverableError(errorCode?: string): boolean {
    if (!errorCode) return true // Error desconocido, intentar de nuevo
    
    const recoverableErrors = [
      'PRINTER_TIMEOUT',
      'PRINTER_BUSY',
      'UNKNOWN_ERROR'
    ]
    
    // Errores no recuperables que no requieren reintentos
    // 'PRINTER_OFF', 'OUT_OF_PAPER', 'PRINTER_DISCONNECTED', 'PERMISSION_DENIED'
    
    return recoverableErrors.includes(errorCode)
  }

  /**
   * Obtener estado de un trabajo específico
   */
  getJobStatus(jobId: string): PrintJob | null {
    // Buscar en cola pendiente
    const pendingJob = this.queue.find(job => job.id === jobId)
    if (pendingJob) return pendingJob

    // Buscar en trabajo actual
    if (this.currentJob && this.currentJob.id === jobId) {
      return this.currentJob
    }

    // Buscar en trabajos completados
    const completedJob = this.completedJobs.find(job => job.id === jobId)
    return completedJob || null
  }

  /**
   * Obtener estado general de la cola
   */
  getQueueStatus(): QueueStatus {
    const processingJobs = this.currentJob ? 1 : 0
    const completedJobs = this.completedJobs.filter(job => job.status === 'completed')
    const failedJobs = this.completedJobs.filter(job => job.status === 'failed')

    return {
      length: this.queue.length,
      processing: processingJobs,
      completed: completedJobs.length,
      failed: failedJobs.length,
      estimatedWaitTime: this.queue.length * this.processingTimeEstimate,
      printerStatus: globalState.printerStatus || 'disconnected', // Usar estado global para consistencia
      recentJobs: this.completedJobs.slice(0, 10)
    }
  }

  /**
   * Obtener longitud de la cola
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Obtener tiempo estimado de espera
   */
  getEstimatedWaitTime(): number {
    return this.queue.length * this.processingTimeEstimate
  }

  /**
   * Cancelar trabajo de impresión
   */
  cancelJob(jobId: string): boolean {
    const jobIndex = this.queue.findIndex(job => job.id === jobId)
    
    if (jobIndex !== -1) {
      const job = this.queue[jobIndex]
      job.status = 'cancelled'
      job.completedAt = new Date()
      
      this.queue.splice(jobIndex, 1)
      this.completedJobs.unshift(job)
      
      console.log(`🚫 Trabajo cancelado: ${jobId}`)
      this.emit('jobCancelled', job)
      
      // Emitir evento Socket.IO
      this.emitSocketEvent('thermal-print:job-cancelled', {
        job: this.sanitizeJobForClient(job),
        queueStatus: this.getQueueStatus()
      })
      
      return true
    }
    
    return false
  }

  /**
   * Limpiar cola de trabajos pendientes (mejorado)
   */
  clearQueue(): number {
    const initialLength = this.queue.length
    
    // Cancelar todos los trabajos pendientes
    this.queue.forEach(job => {
      if (job.status === 'pending') {
        job.status = 'cancelled'
        job.completedAt = new Date()
        this.completedJobs.unshift(job)
        this.emit('jobCancelled', job)
      }
    })
    
    // Mantener solo trabajos en procesamiento (si los hay)
    this.queue = this.queue.filter(job => job.status === 'processing')
    const clearedCount = initialLength - this.queue.length
    
    console.log(`🧹 Cola limpiada: ${clearedCount} trabajos cancelados`)
    this.emit('queueCleared', clearedCount)
    
    // Emitir evento Socket.IO
    this.emitSocketEvent('thermal-print:queue-cleared', {
      clearedCount,
      queueStatus: this.getQueueStatus()
    })
    
    return clearedCount
  }



  /**
   * Obtener estadísticas de la cola
   */
  getStatistics() {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const recent = this.completedJobs.filter(job => 
      job.completedAt && job.completedAt > last24h
    )
    
    const completed = recent.filter(job => job.status === 'completed')
    const failed = recent.filter(job => job.status === 'failed')
    
    return {
      last24h: {
        total: recent.length,
        completed: completed.length,
        failed: failed.length,
        successRate: recent.length > 0 ? (completed.length / recent.length) * 100 : 0
      },
      current: {
        queueLength: this.queue.length,
        processing: this.currentJob ? 1 : 0,
        printerStatus: globalState.printerStatus || 'disconnected' // Usar estado global para consistencia
      }
    }
  }

  // Limpiar trabajos completados antiguos
  private cleanupCompletedJobs() {
    const completedJobs = this.queue.filter(job => job.status === 'completed')
    if (completedJobs.length > this.maxCompletedJobs) {
      const toRemove = completedJobs.length - this.maxCompletedJobs
      const oldestCompleted = completedJobs
        .sort((a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime())
        .slice(0, toRemove)
      
      oldestCompleted.forEach(job => {
        const index = this.queue.findIndex(q => q.id === job.id)
        if (index !== -1) {
          this.queue.splice(index, 1)
        }
      })
    }
  }

  // Métodos de control del servicio
  async startProcessing(): Promise<void> {
    // Verificando estado del servicio de impresión
    
    if (globalState.isRunning || globalState.activeInterval) {
      console.log('El servicio de procesamiento ya está ejecutándose (estado global)')
      // Intentar reconectar la impresora aunque el servicio esté ejecutándose
      await this.connectPrinter()
      return
    }

    this.serviceStartedAt = new Date()
    globalState.startedAt = this.serviceStartedAt
    globalState.isRunning = true
    console.log('🖨️ Servicio de impresión térmica iniciado')

    // Intentar conectar con la impresora primero
    await this.connectPrinter()

    // Procesar cola cada 2 segundos y almacenar en estado global
    const interval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('Error procesando cola:', error)
      })
    }, 2000)
    
    this.processingInterval = interval
    globalState.activeInterval = interval
    
    console.log('✅ Servicio de impresión térmica iniciado correctamente')
    
    // Procesar inmediatamente si hay trabajos en cola
    if (this.queue.length > 0) {
      console.log(`📋 Procesando ${this.queue.length} trabajos pendientes en cola...`)
      this.processQueue().catch(error => {
        console.error('Error procesando cola inicial:', error)
      })
    }
  }

  async stopProcessing(): Promise<void> {
    if (!this.processingInterval && !globalState.activeInterval) {
      console.log('El servicio de procesamiento no está ejecutándose')
      return
    }
    
    // Limpiar interval local
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    
    // Limpiar interval global
    if (globalState.activeInterval) {
      clearInterval(globalState.activeInterval)
      globalState.activeInterval = null
    }
    
    // Limpiar estado
    this.serviceStartedAt = null
    globalState.isRunning = false
    globalState.startedAt = null

    // Desconectar impresora
    await this.disconnectPrinter()
    
    console.log('🖨️ Servicio de impresión térmica detenido')
  }

  getServiceStatus() {
    // Usar estado global para mantener consistencia entre instancias
    const isRunning = globalState.isRunning || this.processingInterval !== null
    const startedAt = globalState.startedAt || this.serviceStartedAt
    const uptime = startedAt 
      ? Date.now() - startedAt.getTime()
      : 0

    return {
      isRunning,
      startedAt: startedAt?.toISOString() || null,
      uptime: uptime,
      processedJobs: globalState.processedJobs + this.stats.completedJobs,
      failedJobs: globalState.failedJobs + this.stats.failedJobs,
      currentJob: this.currentJob,
      printerStatus: this.printerStatus,
      queueLength: this.queue.filter(job => job.status === 'pending').length
    }
  }

  /**
   * Actualizar configuración de impresora (útil para cambios dinámicos)
   */
  async updatePrinterConfig(): Promise<void> {
    console.log('🔄 Actualizando configuración de impresora...')
    await this.loadPrinterConfig()
    
    // Si el servicio está ejecutándose, reconectar con nueva configuración
    if (globalState.isRunning) {
      await this.disconnectPrinter()
      await this.connectPrinter()
    }
  }

  /**
   * Obtener configuración actual de la impresora
   */
  getPrinterConfig() {
    return {
      ...this.printerConfig,
      status: this.printerStatus
    }
  }

  /**
   * Conectar con la impresora
   */
  private async connectPrinter(): Promise<void> {
    try {
      console.log('🔌 Conectando con impresora térmica...')
      await this.initializePrinter()
    } catch (error) {
      console.error('❌ Error al conectar impresora:', error)
      this.printerStatus = 'error'
    }
  }

  /**
   * Desconectar impresora
   */
  private async disconnectPrinter(): Promise<void> {
    try {
      console.log('🔌 Desconectando impresora térmica...')
      this.printerStatus = 'disconnected'
    globalState.printerStatus = 'disconnected'
    } catch (error) {
      console.error('❌ Error al desconectar impresora:', error)
    }
  }

  /**
   * Procesar cola de trabajos
   */
  private async processQueue(): Promise<void> {
    // Procesar cola si hay trabajos pendientes, independientemente del estado de la impresora
    if (this.queue.length > 0 && !this.currentJob) {
      console.log(`📋 Procesando ${this.queue.length} trabajos en cola...`)
      
      // Si la impresora no está conectada, intentar conectarla
      if (this.printerStatus !== 'connected') {
        console.log('🔌 Conectando impresora para procesar cola...')
        await this.connectPrinter()
      }
      
      // Procesar el siguiente trabajo
      await this.processNextJob()
    }
    // Eliminar logs repetitivos de cola vacía y estado de procesamiento
  }

  /**
   * Emitir evento Socket.IO para actualizaciones en tiempo real
   */
  private emitSocketEvent(event: string, data: Record<string, unknown>): void {
    try {
      if (global.io) {
        global.io.to('thermal-print').emit(event, data)
        console.log(`📡 Evento Socket.IO '${event}' emitido a sala 'thermal-print'`)
      }
    } catch (error) {
      console.error('Error emitiendo evento Socket.IO:', error)
    }
  }

  /**
   * Sanitizar datos del trabajo para el cliente
   */
  private sanitizeJobForClient(job: PrintJob): Partial<PrintJob> {
    return {
      id: job.id,
      orderId: job.orderId,
      orderNumber: job.orderNumber,
      documentType: job.documentType,
      status: job.status,
      progress: job.progress,
      error: job.error,
      errorCode: job.errorCode,
      userMessage: job.userMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      retryCount: job.retryCount,
      priority: job.priority,
      requestedBy: {
        id: job.requestedBy.id,
        name: job.requestedBy.name,
        role: job.requestedBy.role
      },
      metadata: job.metadata
    }
  }
}

// Exportar instancia singleton
export const thermalPrintQueue = ThermalPrintQueue.getInstance()