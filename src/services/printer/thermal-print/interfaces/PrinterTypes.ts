/**
 * Tipos y interfaces para el Sistema Dual de Impresoras
 * Versión: 1.0 - Base evolutiva compatible con sistema actual
 */

// === TIPOS BASE ===
export enum PrinterType {
  FISCAL = 'fiscal',           // Impresora fiscal Bluetooth (existente)
  KITCHEN = 'kitchen'          // Impresora cocina TCP/IP (nueva)
}

export enum PrinterConnectionType {
  BLUETOOTH = 'bluetooth',     // Para impresora fiscal
  NETWORK = 'network'          // Para impresora cocina
}

export enum DocumentType {
  // Documentos fiscales (van a impresora Bluetooth) - PRESERVAR COMPATIBILIDAD
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  
  // Documentos de cocina (van a impresora TCP/IP) - NUEVOS
  KITCHEN_ORDER = 'KITCHEN_ORDER',
  KITCHEN_TICKET = 'KITCHEN_TICKET',
  
  // Documentos de prueba
  TEST_PRINT = 'TEST_PRINT'
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRY = 'retry'
}

export enum SystemMode {
  SINGLE = 'SINGLE',           // Solo impresora fiscal (actual)
  DUAL = 'DUAL',               // Ambas impresoras
  FISCAL_ONLY = 'FISCAL_ONLY', // Solo fiscal
  KITCHEN_ONLY = 'KITCHEN_ONLY' // Solo cocina
}

// === CONFIGURACIONES ===
export interface BasePrinterConfig {
  id: string
  name: string
  type: PrinterType
  connectionType: PrinterConnectionType
  isEnabled: boolean
  documentTypes: DocumentType[]
  timeout: number
}

export interface BluetoothPrinterConfig extends BasePrinterConfig {
  connectionType: PrinterConnectionType.BLUETOOTH
  connection: {
    port: string          // COM7
    baudRate: number      // 115200
    dataBits: number      // 8
    stopBits: number      // 1
    parity: 'none' | 'even' | 'odd'
    flowControl: boolean
  }
}

export interface NetworkPrinterConfig extends BasePrinterConfig {
  connectionType: PrinterConnectionType.NETWORK
  connection: {
    ip: string           // 192.168.1.100
    port: number         // 9100
    keepAlive: boolean
    noDelay: boolean
    reconnectInterval: number
  }
}

export type PrinterConfig = BluetoothPrinterConfig | NetworkPrinterConfig

// === COMPATIBILIDAD CON SISTEMA ACTUAL ===
// Preservamos la interfaz existente para no romper nada
export interface LegacyPrintJobRequest {
  orderId: string
  orderNumber: string
  documentType: 'BOLETA' | 'FACTURA'  // Tipos actuales
  content: string
  requestedBy: {
    id: string
    name: string
    role: string
  }
  metadata?: Record<string, unknown>
}

// === INTERFACES EXTENDIDAS PARA SISTEMA DUAL ===
export interface EnhancedPrintJobRequest {
  orderId: string
  orderNumber: string
  documentType: DocumentType         // Ampliado para incluir tipos de cocina
  content: string
  requestedBy: {
    id: string
    name: string
    role: string
  }
  metadata?: Record<string, unknown>
  printerType?: PrinterType          // Opcional, se asigna automáticamente
  priority?: number                  // Prioridad del trabajo
}

export interface PrintJob extends EnhancedPrintJobRequest {
  id: string
  printerType: PrinterType        // Determina qué impresora usar
  printerAssigned?: string        // ID de impresora asignada
  status: JobStatus
  priority: number
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
  errorMessage?: string
  errorCode?: string
  estimatedDuration: number
  actualDuration?: number
}

// === ESTADOS DEL SISTEMA ===
export interface PrinterStatus {
  id: string
  name: string
  type: PrinterType
  connectionType: PrinterConnectionType
  status: 'connected' | 'disconnected' | 'busy' | 'error' | 'unknown'
  lastCheck: Date
  lastSuccessfulPrint: Date | null
  errorMessage?: string
  isHealthy: boolean
  responseTime?: number
}

export interface SystemStatus {
  mode: SystemMode
  isRunning: boolean
  startedAt: Date | null
  uptime: number
  fiscalPrinter: PrinterStatus | null
  kitchenPrinter: PrinterStatus | null
  totalJobs: number
  completedJobs: number
  failedJobs: number
  systemHealth: 'healthy' | 'warning' | 'error' | 'degraded'
}

// === UTILIDADES ===
export interface ValidationResult {
  isValid: boolean
  printerType: PrinterType
  connectionType: PrinterConnectionType
  responseTime?: number
  errorMessage?: string
  timestamp: Date
}
