/**
 * Configuración Central del Sistema de Impresión Dual
 * Configuración unificada para impresoras Bluetooth y TCP/IP
 */

import { type DualPrintConfig } from '../services/DualPrintService'

/**
 * Configuración por defecto del sistema dual
 */
export const defaultDualPrintConfig: DualPrintConfig = {
  // Configuración impresora fiscal (Bluetooth COM7)
  fiscal: {
    enabled: process.env.FISCAL_PRINTER_ENABLED === 'true',
    port: process.env.FISCAL_PRINTER_PORT || 'COM7',
    baudRate: parseInt(process.env.FISCAL_PRINTER_BAUD_RATE || '115200'),
    name: process.env.FISCAL_PRINTER_NAME || 'Impresora Fiscal Bluetooth'
  },
  
  // Configuración impresora cocina (TCP/IP ZJ-8360)
  kitchen: {
    ip: process.env.KITCHEN_PRINTER_IP || '192.168.0.150',
    port: parseInt(process.env.KITCHEN_PRINTER_PORT || '9100'),
    timeout: parseInt(process.env.KITCHEN_PRINTER_TIMEOUT || '5000'),
    name: process.env.KITCHEN_PRINTER_NAME || 'ZJ-8360 Cocina',
    enabled: process.env.KITCHEN_PRINTER_ENABLED === 'true',
    keepAlive: process.env.KITCHEN_PRINTER_KEEPALIVE === 'true',
    noDelay: process.env.KITCHEN_PRINTER_NODELAY === 'true',
    reconnectInterval: parseInt(process.env.KITCHEN_PRINTER_RECONNECT_INTERVAL || '3000')
  },
  
  // Opciones de formateo para tickets de cocina
  kitchenFormatting: {
    showTimestamp: true,
    showWaiter: true,
    showTable: true,
    includeQR: false,
    priorityHighlight: true,
    allergyWarnings: true,
    doubleSize: false,
    autoBeep: true,
    paperWidth: 32 // caracteres por línea para papel 58mm
  },
  
  // Configuración general del servicio
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 2000, // 2 segundos
  logLevel: (process.env.DUAL_PRINT_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info'
}

/**
 * Configuraciones predefinidas para diferentes ambientes
 */
export const environmentConfigs = {
  development: {
    ...defaultDualPrintConfig,
    logLevel: 'debug' as const,
    kitchen: {
      ...defaultDualPrintConfig.kitchen,
      enabled: false, // Deshabilitar en desarrollo si no hay hardware
      timeout: 3000
    }
  },
  
  production: {
    ...defaultDualPrintConfig,
    logLevel: 'warn' as const,
    autoRetry: true,
    maxRetries: 5
  },
  
  testing: {
    ...defaultDualPrintConfig,
    logLevel: 'error' as const,
    fiscal: {
      ...defaultDualPrintConfig.fiscal,
      enabled: false
    },
    kitchen: {
      ...defaultDualPrintConfig.kitchen,
      enabled: false
    }
  }
}

/**
 * Configuraciones específicas por tipo de impresora
 */
export const printerConfigs = {
  // Configuración optimizada para ZJ-8360
  zj8360: {
    timeout: 5000,
    keepAlive: true,
    noDelay: true,
    reconnectInterval: 3000,
    paperWidth: 32
  },
  
  // Configuración para otras impresoras de 58mm
  thermal58mm: {
    timeout: 3000,
    keepAlive: false,
    noDelay: true,
    reconnectInterval: 5000,
    paperWidth: 32
  },
  
  // Configuración para impresoras de 80mm
  thermal80mm: {
    timeout: 4000,
    keepAlive: true,
    noDelay: true,
    reconnectInterval: 3000,
    paperWidth: 48
  }
}

/**
 * Templates de formateo por tipo de negocio
 */
export const businessTemplates = {
  restaurant: {
    header: '🍳 ORDEN DE COCINA 🍳',
    footer: 'Mr. Frit - Cocina',
    separator: '='.repeat(32),
    priorityMarkers: {
      low: '🟢',
      normal: '🔵', 
      high: '🟡',
      urgent: '🔴'
    }
  },
  
  fastFood: {
    header: '⚡ PREPARACIÓN RÁPIDA ⚡',
    footer: 'Cocina Express',
    separator: '-'.repeat(32),
    priorityMarkers: {
      low: '✅',
      normal: '⏱️',
      high: '⚡',
      urgent: '🚨'
    }
  },
  
  cafe: {
    header: '☕ ORDEN CAFETERÍA ☕',
    footer: 'Barra de Preparación',
    separator: '~'.repeat(32),
    priorityMarkers: {
      low: '🟢',
      normal: '☕',
      high: '🟡',
      urgent: '🔥'
    }
  }
}

/**
 * Validar configuración antes de usar
 */
export function validateDualPrintConfig(config: Partial<DualPrintConfig>): string[] {
  const errors: string[] = []
  
  // Validar configuración fiscal
  if (config.fiscal?.enabled) {
    if (!config.fiscal.port) {
      errors.push('FISCAL_PORT_REQUIRED: Puerto de impresora fiscal requerido')
    }
    
    if (!config.fiscal.baudRate || config.fiscal.baudRate <= 0) {
      errors.push('FISCAL_BAUDRATE_INVALID: Velocidad de puerto fiscal inválida')
    }
  }
  
  // Validar configuración de cocina
  if (config.kitchen?.enabled) {
    if (!config.kitchen.ip) {
      errors.push('KITCHEN_IP_REQUIRED: IP de impresora de cocina requerida')
    }
    
    if (!config.kitchen.port || config.kitchen.port <= 0 || config.kitchen.port > 65535) {
      errors.push('KITCHEN_PORT_INVALID: Puerto de impresora de cocina inválido')
    }
    
    if (!config.kitchen.timeout || config.kitchen.timeout <= 0) {
      errors.push('KITCHEN_TIMEOUT_INVALID: Timeout de impresora de cocina inválido')
    }
  }
  
  // Validar que al menos una impresora esté habilitada
  if (!config.fiscal?.enabled && !config.kitchen?.enabled) {
    errors.push('NO_PRINTERS_ENABLED: Al menos una impresora debe estar habilitada')
  }
  
  // Validar opciones de formateo
  if (config.kitchenFormatting) {
    const paperWidth = config.kitchenFormatting.paperWidth
    if (paperWidth && (paperWidth < 20 || paperWidth > 80)) {
      errors.push('PAPER_WIDTH_INVALID: Ancho de papel debe estar entre 20 y 80 caracteres')
    }
  }
  
  return errors
}

/**
 * Crear configuración para un ambiente específico
 */
export function createEnvironmentConfig(environment: keyof typeof environmentConfigs): DualPrintConfig {
  const baseConfig = environmentConfigs[environment]
  
  if (!baseConfig) {
    throw new Error(`INVALID_ENVIRONMENT: Ambiente '${environment}' no encontrado`)
  }
  
  const errors = validateDualPrintConfig(baseConfig)
  if (errors.length > 0) {
    throw new Error(`CONFIG_VALIDATION_FAILED: ${errors.join(', ')}`)
  }
  
  return baseConfig
}

/**
 * Configuración de red para debugging
 */
export const networkDiagnostics = {
  // Comandos de red útiles para diagnosticar conectividad
  pingCommand: (ip: string) => `ping -n 4 ${ip}`,
  telnetCommand: (ip: string, port: number) => `telnet ${ip} ${port}`,
  netstatCommand: 'netstat -an | findstr :9100',
  
  // IPs comunes para impresoras térmicas
  commonPrinterIPs: [
    '192.168.1.100',
    '192.168.0.150', 
    '192.168.1.200',
    '10.0.0.100'
  ],
  
  // Puertos comunes
  commonPorts: [9100, 9101, 9102, 515]
}

/**
 * Configuración de desarrollo con mock
 */
export const mockConfig: DualPrintConfig = {
  ...defaultDualPrintConfig,
  fiscal: {
    ...defaultDualPrintConfig.fiscal,
    enabled: false // Usar mock en desarrollo
  },
  kitchen: {
    ...defaultDualPrintConfig.kitchen,
    enabled: false, // Usar mock en desarrollo
    ip: 'localhost',
    port: 9999 // Puerto mock
  },
  logLevel: 'debug'
}

/**
 * Exportar configuración activa basada en NODE_ENV
 */
export function getActiveConfig(): DualPrintConfig {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'production':
      return createEnvironmentConfig('production')
    case 'test':
      return createEnvironmentConfig('testing')
    case 'development':
    default:
      return createEnvironmentConfig('development')
  }
}
