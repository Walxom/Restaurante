/**
 * @service system.service.ts
 * Lógica de SERVIDOR de la configuración del sistema (Prisma + caché).
 *
 * Las utilidades seguras para el cliente (tipos, constantes, fetch helpers)
 * viven en `@/features/dashboard/utils/system-config-client` para no arrastrar
 * Prisma al bundle del navegador. Importar este archivo desde componentes de
 * cliente rompe con "PrismaClient is unable to run in this browser environment".
 */

import { prisma } from '@/lib/prisma'
import type { SystemConfigData } from '@/features/dashboard/utils/system-config-client'

export type { SystemConfigData }

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
