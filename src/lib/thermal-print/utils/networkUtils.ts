/**
 * Utilidades de Red para Impresoras TCP/IP
 * Funciones auxiliares para diagnóstico y validación de conectividad
 */

import * as net from 'net'

export interface NetworkHealth {
  ip: string
  port: number
  isReachable: boolean
  responseTime: number
  lastChecked: Date
  error?: string
}

export interface PrinterNetworkInfo {
  ip: string
  port: number
  hostname?: string
  macAddress?: string
  model?: string
  status?: 'online' | 'offline' | 'error' | 'unknown'
}

/**
 * Verificar conectividad TCP/IP básica
 */
export async function checkTCPConnection(
  ip: string, 
  port: number, 
  timeout: number = 3000
): Promise<NetworkHealth> {
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true
        socket.destroy()
      }
    }
    
    const timeout_id = setTimeout(() => {
      cleanup()
      resolve({
        ip,
        port,
        isReachable: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: 'TIMEOUT'
      })
    }, timeout)
    
    socket.on('connect', () => {
      cleanup()
      clearTimeout(timeout_id)
      resolve({
        ip,
        port,
        isReachable: true,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      })
    })
    
    socket.on('error', (error) => {
      cleanup()
      clearTimeout(timeout_id)
      resolve({
        ip,
        port,
        isReachable: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      })
    })
    
    try {
      socket.connect(port, ip)
    } catch (error) {
      cleanup()
      clearTimeout(timeout_id)
      resolve({
        ip,
        port,
        isReachable: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      })
    }
  })
}

/**
 * Escanear rango de IPs buscando impresoras
 */
export async function scanPrinterNetwork(
  baseIP: string = '192.168.1',
  startRange: number = 1,
  endRange: number = 254,
  port: number = 9100,
  timeout: number = 1000
): Promise<PrinterNetworkInfo[]> {
  console.log(`🔍 Escaneando red ${baseIP}.${startRange}-${endRange}:${port}`)
  
  const promises: Promise<NetworkHealth>[] = []
  
  // Crear promesas para escanear rango
  for (let i = startRange; i <= endRange; i++) {
    const ip = `${baseIP}.${i}`
    promises.push(checkTCPConnection(ip, port, timeout))
  }
  
  // Ejecutar escaneo en paralelo con límite
  const batchSize = 20 // Procesar 20 IPs a la vez
  const results: PrinterNetworkInfo[] = []
  
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch)
    
    // Filtrar solo IPs que respondieron
    const reachableIPs = batchResults
      .filter(result => result.isReachable)
      .map(result => ({
        ip: result.ip,
        port: result.port,
        status: 'online' as const
      }))
    
    results.push(...reachableIPs)
    
    // Progreso del escaneo
    const progress = Math.min(i + batchSize, promises.length)
    console.log(`📡 Progreso: ${progress}/${promises.length} IPs escaneadas`)
  }
  
  console.log(`✅ Escaneo completado: ${results.length} impresoras encontradas`)
  return results
}

/**
 * Validar formato de IP
 */
export function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

/**
 * Validar rango de puerto
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535
}

/**
 * Obtener información de red local
 */
export function getLocalNetworkInfo() {
  const os = require('os')
  const interfaces = os.networkInterfaces()
  const networks: Array<{ name: string; ip: string; subnet: string }> = []
  
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses || !Array.isArray(addresses)) continue
    
    for (const addr of addresses) {
      // Solo IPv4, no loopback, no internas
      if (addr.family === 'IPv4' && !addr.internal) {
        const subnet = addr.address.split('.').slice(0, 3).join('.')
        networks.push({
          name,
          ip: addr.address,
          subnet
        })
      }
    }
  }
  
  return networks
}

/**
 * Generar IPs sugeridas basadas en la red local
 */
export function getSuggestedPrinterIPs(): string[] {
  const networks = getLocalNetworkInfo()
  const suggestions: string[] = []
  
  // IPs típicas para cada subred encontrada
  const commonLastOctets = [100, 101, 102, 200, 201, 250]
  
  for (const network of networks) {
    for (const octet of commonLastOctets) {
      suggestions.push(`${network.subnet}.${octet}`)
    }
  }
  
  // IPs por defecto comunes
  const defaultIPs = [
    '192.168.1.100',
    '192.168.0.151',
    '10.0.0.100',
    '172.16.0.100'
  ]
  
  // Combinar sin duplicados
  return [...new Set([...suggestions, ...defaultIPs])]
}

/**
 * Test de rendimiento de red
 */
export async function testNetworkPerformance(
  ip: string,
  port: number,
  iterations: number = 5
): Promise<{
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  successRate: number
  jitter: number
}> {
  console.log(`⚡ Probando rendimiento de red para ${ip}:${port}`)
  
  const results: number[] = []
  let successCount = 0
  
  for (let i = 0; i < iterations; i++) {
    try {
      const health = await checkTCPConnection(ip, port, 5000)
      if (health.isReachable) {
        results.push(health.responseTime)
        successCount++
      }
    } catch (error) {
      console.warn(`❌ Iteración ${i + 1} falló:`, error)
    }
    
    // Pausa entre tests
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  if (results.length === 0) {
    return {
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      successRate: 0,
      jitter: 0
    }
  }
  
  const average = results.reduce((sum, time) => sum + time, 0) / results.length
  const min = Math.min(...results)
  const max = Math.max(...results)
  const successRate = (successCount / iterations) * 100
  
  // Calcular jitter (variación en latencia)
  const variance = results.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / results.length
  const jitter = Math.sqrt(variance)
  
  return {
    averageResponseTime: Math.round(average),
    minResponseTime: min,
    maxResponseTime: max,
    successRate: Math.round(successRate),
    jitter: Math.round(jitter)
  }
}

/**
 * Diagnóstico completo de impresora TCP/IP
 */
export async function diagnosePrinter(ip: string, port: number = 9100) {
  console.log(`🔍 Diagnosticando impresora ${ip}:${port}`)
  
  const results = {
    basicConnectivity: await checkTCPConnection(ip, port),
    performance: await testNetworkPerformance(ip, port, 3),
    networkInfo: getLocalNetworkInfo(),
    suggestions: [] as string[]
  }
  
  // Generar sugerencias basadas en los resultados
  if (!results.basicConnectivity.isReachable) {
    results.suggestions.push('Verificar que la impresora esté encendida y conectada a la red')
    results.suggestions.push('Verificar configuración de IP de la impresora')
    results.suggestions.push('Verificar que no hay firewall bloqueando el puerto')
    
    if (results.basicConnectivity.error?.includes('TIMEOUT')) {
      results.suggestions.push('La impresora puede estar en una subred diferente')
      results.suggestions.push('Verificar configuración de red local')
    }
  } else {
    if (results.performance.averageResponseTime > 1000) {
      results.suggestions.push('Latencia alta detectada - verificar red local')
    }
    
    if (results.performance.successRate < 100) {
      results.suggestions.push('Conexión inestable - verificar cable de red o WiFi')
    }
  }
  
  return results
}

/**
 * Monitor de salud de red en tiempo real
 */
export class NetworkHealthMonitor {
  private ip: string
  private port: number
  private interval: NodeJS.Timeout | null = null
  private isMonitoring = false
  private lastHealth: NetworkHealth | null = null
  private healthHistory: NetworkHealth[] = []
  private maxHistorySize = 100
  
  constructor(ip: string, port: number) {
    this.ip = ip
    this.port = port
  }
  
  start(intervalMs: number = 30000) {
    if (this.isMonitoring) return
    
    console.log(`📊 Iniciando monitor de salud para ${this.ip}:${this.port}`)
    this.isMonitoring = true
    
    this.interval = setInterval(async () => {
      try {
        const health = await checkTCPConnection(this.ip, this.port, 3000)
        this.lastHealth = health
        
        // Agregar a historial
        this.healthHistory.push(health)
        if (this.healthHistory.length > this.maxHistorySize) {
          this.healthHistory.shift()
        }
        
        // Log cambios de estado
        if (this.healthHistory.length >= 2) {
          const previous = this.healthHistory[this.healthHistory.length - 2]
          if (previous.isReachable !== health.isReachable) {
            const status = health.isReachable ? 'ONLINE' : 'OFFLINE'
            console.log(`🔄 Estado de impresora cambió a: ${status}`)
          }
        }
        
      } catch (error) {
        console.error('❌ Error en monitor de salud:', error)
      }
    }, intervalMs)
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isMonitoring = false
    console.log(`⏹️ Monitor de salud detenido`)
  }
  
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastHealth: this.lastHealth,
      healthHistory: this.healthHistory.slice(-10), // Últimos 10 registros
      uptime: this.calculateUptime(),
      averageResponseTime: this.calculateAverageResponseTime()
    }
  }
  
  private calculateUptime(): number {
    if (this.healthHistory.length === 0) return 0
    
    const onlineCount = this.healthHistory.filter(h => h.isReachable).length
    return (onlineCount / this.healthHistory.length) * 100
  }
  
  private calculateAverageResponseTime(): number {
    const reachableHealths = this.healthHistory.filter(h => h.isReachable)
    if (reachableHealths.length === 0) return 0
    
    const totalTime = reachableHealths.reduce((sum, h) => sum + h.responseTime, 0)
    return totalTime / reachableHealths.length
  }
}
