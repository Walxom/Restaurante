/**
 * Sistema de Impresión Dual - Punto de Entrada Principal
 * Exporta todas las funcionalidades del sistema de impresión TCP/IP + Bluetooth
 */

// Drivers de impresoras
export { ZJ8360NetworkDriver } from './drivers/ZJ8360NetworkDriver'
export type { 
  ZJ8360Config, 
  KitchenOrderData, 
  KitchenItem 
} from './drivers/ZJ8360NetworkDriver'

// Formateadores
export { KitchenOrderFormatter } from './formatters/KitchenOrderFormatter'
export type { 
  KitchenFormattingOptions, 
  KitchenTicketTemplate 
} from './formatters/KitchenOrderFormatter'

// Servicio principal
export { DualPrintService } from './services/DualPrintService'
export type { 
  DualPrintConfig, 
  PrintJob, 
  PrintResult,
  FiscalDocumentData
} from './services/DualPrintService'

// Configuración
export { 
  defaultDualPrintConfig,
  environmentConfigs,
  printerConfigs,
  businessTemplates,
  networkDiagnostics,
  mockConfig,
  validateDualPrintConfig,
  createEnvironmentConfig,
  getActiveConfig
} from './config/printerConfig'

// Utilidades de red
export { 
  checkTCPConnection,
  scanPrinterNetwork,
  isValidIP,
  isValidPort,
  getLocalNetworkInfo,
  getSuggestedPrinterIPs,
  testNetworkPerformance,
  diagnosePrinter,
  NetworkHealthMonitor
} from './utils/networkUtils'
export type { 
  NetworkHealth, 
  PrinterNetworkInfo 
} from './utils/networkUtils'

import type { DualPrintConfig } from './services/DualPrintService'
import type { KitchenOrderData } from './drivers/ZJ8360NetworkDriver'

/**
 * Función de inicialización rápida del sistema dual
 */
export async function initializeDualPrintSystem(customConfig?: Partial<DualPrintConfig>) {
  const { DualPrintService } = await import('./services/DualPrintService')
  const { getActiveConfig } = await import('./config/printerConfig')
  
  const config = customConfig ? 
    { ...getActiveConfig(), ...customConfig } : 
    getActiveConfig()
  
  const service = new DualPrintService(config)
  await service.initialize()
  
  return service
}

/**
 * Utilitarios para desarrollo y testing
 */
export const DevUtils = {
  /**
   * Crear datos de prueba para órdenes de cocina
   */
  createMockKitchenOrder: (orderNumber: string): KitchenOrderData => ({
    orderNumber,
    tableNumber: 'Mesa 5',
    waiterName: 'Juan Pérez',
    items: [
      {
        name: 'Pollo a la Plancha',
        quantity: 2,
        modifications: ['Sin sal', 'Término medio'],
        cookingInstructions: 'Cocinar por 8 minutos',
        allergyWarnings: ['Gluten']
      },
      {
        name: 'Ensalada César',
        quantity: 1,
        modifications: ['Sin crutones'],
        allergyWarnings: ['Lácteos']
      }
    ],
    notes: 'Cliente con alergia severa al gluten',
    priority: 'high',
    timestamp: new Date()
  }),
  
  /**
   * Test de conectividad rápido
   */
  quickConnectivityTest: async (ip?: string, port?: number) => {
    const { checkTCPConnection } = await import('./utils/networkUtils')
    
    // Obtener configuración desde la base de datos si no se proporcionan parámetros
    let finalIp = ip
    let finalPort = port
    
    if (!finalIp || !finalPort) {
      try {
        const { PrinterConfigService } = await import('../printer-config')
        const config = await PrinterConfigService.getKitchenPrinterConfig()
        if (config) {
          finalIp = finalIp || config.ip
          finalPort = finalPort || config.port
        }
      } catch {
        console.warn('No se pudo obtener configuración de BD, usando valores por defecto')
        finalIp = finalIp || '192.168.1.100'  // Valor genérico por defecto
        finalPort = finalPort || 9100
      }
    }
    
    return checkTCPConnection(finalIp!, finalPort!, 3000)
  },
  
  /**
   * Escaneo rápido de red local
   */
  quickNetworkScan: async () => {
    const { getSuggestedPrinterIPs, checkTCPConnection } = await import('./utils/networkUtils')
    const suggestedIPs = getSuggestedPrinterIPs().slice(0, 5) // Solo primeros 5
    
    const results = await Promise.all(
      suggestedIPs.map(ip => checkTCPConnection(ip, 9100, 1000))
    )
    
    return results.filter(result => result.isReachable)
  }
}

/**
 * Constantes del sistema
 */
export const ThermalPrintConstants = {
  // Puertos comunes para impresoras térmicas
  COMMON_PORTS: [9100, 9101, 9102, 515],
  
  // Anchos de papel estándar (en caracteres)
  PAPER_WIDTHS: {
    MM_58: 32,
    MM_80: 48
  },
  
  // Velocidades de baudios para puertos serie
  BAUD_RATES: [9600, 19200, 38400, 57600, 115200],
  
  // Timeouts recomendados (ms)
  TIMEOUTS: {
    CONNECTION: 5000,
    PRINT: 10000,
    SCAN: 1000
  },
  
  // Códigos de error comunes
  ERROR_CODES: {
    TIMEOUT_CONNECTION: 'La impresora no responde en el tiempo esperado',
    CONNECTION_REFUSED: 'La impresora rechazó la conexión',
    HOST_UNREACHABLE: 'No se puede alcanzar la dirección IP',
    NETWORK_UNREACHABLE: 'Red no disponible',
    NETWORK_TIMEOUT: 'Timeout de red',
    HOST_NOT_FOUND: 'Dirección IP no encontrada',
    PRINTER_DISCONNECTED: 'Impresora desconectada',
    SEND_ERROR: 'Error enviando datos a la impresora',
    DUAL_PRINT_NOT_INITIALIZED: 'Sistema de impresión no inicializado',
    KITCHEN_PRINTER_DISABLED: 'Impresora de cocina deshabilitada',
    FISCAL_PRINTER_DISABLED: 'Impresora fiscal deshabilitada'
  }
}

/**
 * Información de la versión del sistema
 */
export const SystemInfo = {
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  compatibility: {
    protocols: ['TCP/IP', 'Bluetooth/Serial'],
    printers: ['ZJ-8360', 'ESC/POS Compatible'],
    paperSizes: ['58mm', '80mm'],
    platforms: ['Windows', 'Linux', 'macOS']
  },
  features: [
    'Impresión dual (Cocina + Fiscal)',
    'Reconexión automática',
    'Monitor de salud de red',
    'Formateo automático de tickets',
    'Cola de trabajos con reintentos',
    'Diagnóstico de red',
    'Configuración por ambiente'
  ]
}

// Exportación por defecto para uso simple
const ThermalPrintSystem = {
  initializeDualPrintSystem,
  DevUtils,
  ThermalPrintConstants,
  SystemInfo
}

export default ThermalPrintSystem
