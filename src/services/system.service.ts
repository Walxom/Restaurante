/**
 * @service system.service.ts
 * Servicio centralizado para la configuración del sistema.
 * 
 * Este archivo combina la lógica de servidor (Prisma) y las utilidades 
 * compartidas de configuración.
 */

import { prisma } from '@/lib/prisma'

// ─── Tipos y Constantes ──────────────────────────────────────────────────────

export interface SystemConfigData {
  id: string
  companyName: string
  companyAddress: string | null
  companyPhone: string | null
  companyRuc: string | null
  taxRate: number
  currency: string
  timezone: string
  lastBoletaNumber: number
  lastFacturaNumber: number
}

export const SUPPORTED_CURRENCIES = [
  { value: "PEN", label: "Soles (S/)" },
  { value: "USD", label: "Dólares ($)" },
  { value: "EUR", label: "Euros (€)" },
  { value: "CLP", label: "Peso Chileno ($)" },
  { value: "COP", label: "Peso Colombiano ($)" },
  { value: "MXN", label: "Peso Mexicano ($)" },
]

export const getSupportedTimezones = () => {
  try {
    return Intl.supportedValuesOf('timeZone').map(tz => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('es-PE', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      })
      const parts = formatter.formatToParts(now)
      const offset = parts.find(p => p.type === 'timeZoneName')?.value || ''
      return { value: tz, label: `${tz} (${offset})` }
    }).sort((a, b) => a.label.localeCompare(b.label))
  } catch (e) {
    return [{ value: "America/Lima", label: "America/Lima (GMT-5)" }]
  }
}

// ─── Lógica de Servidor (Prisma + Cache) ─────────────────────────────────────

let configCache: SystemConfigData | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

/**
 * Obtiene la configuración del sistema desde la base de datos (Server-side)
 */
export async function getSystemConfig(): Promise<SystemConfigData> {
  const now = Date.now()

  if (configCache && now - lastCacheUpdate < CACHE_DURATION) {
    return configCache
  }

  try {
    const config = await prisma.systemConfig.findFirst()

    if (config) {
      configCache = config as SystemConfigData
      lastCacheUpdate = now
      return configCache
    }

    // Crear configuración por defecto si no existe
    const defaultConfig = await prisma.systemConfig.create({
      data: {
        companyName: 'Restaurant',
        companyAddress: 'Dirección no configurada',
        companyPhone: 'Teléfono no configurado',
        companyRuc: 'RUC no configurado',
        taxRate: 0.18,
        currency: 'PEN',
        timezone: 'America/Lima',
        lastBoletaNumber: 0,
        lastFacturaNumber: 0,
      },
    })

    configCache = defaultConfig as SystemConfigData
    lastCacheUpdate = now
    return configCache
  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error)

    return {
      id: 'default',
      companyName: 'Restaurant',
      companyAddress: 'Dirección no configurada',
      companyPhone: 'Teléfono no configurado',
      companyRuc: 'RUC no configurado',
      taxRate: 0.18,
      currency: 'PEN',
      timezone: 'America/Lima',
      lastBoletaNumber: 0,
      lastFacturaNumber: 0,
    }
  }
}

export function invalidateConfigCache(): void {
  configCache = null
  lastCacheUpdate = 0
}

export async function getCompanyName(): Promise<string> {
  const config = await getSystemConfig()
  return config.companyName
}

// ─── Utilidades de Cliente (Fetch API) ───────────────────────────────────────

/**
 * Obtiene la configuración desde el API (Client-side)
 */
export async function fetchSystemConfigForClient(): Promise<SystemConfigData> {
  try {
    const response = await fetch('/api/system-config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Error al obtener configuración')
    }

    return await response.json()
  } catch (error) {
    console.error('Error al obtener configuración del cliente:', error)

    return {
      id: 'default',
      companyName: 'Restaurant',
      companyAddress: 'Dirección no configurada',
      companyPhone: 'Teléfono no configurado',
      companyRuc: 'RUC no configurado',
      taxRate: 0.18,
      currency: 'PEN',
      timezone: 'America/Lima',
      lastBoletaNumber: 0,
      lastFacturaNumber: 0
    }
  }
}

/**
 * Obtiene información pública de la empresa (Client-side)
 */
export async function fetchPublicCompanyInfo(): Promise<{ companyName: string; currency: string }> {
  try {
    const response = await fetch('/api/public/company-info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Error al obtener información de la empresa')
    }

    return await response.json()
  } catch (error) {
    console.error('Error al obtener información pública de la empresa:', error)

    return {
      companyName: 'Restaurant',
      currency: 'PEN'
    }
  }
}
