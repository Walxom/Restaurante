import { prisma } from '@/lib/prisma'

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

let configCache: SystemConfigData | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function getSystemConfig(): Promise<SystemConfigData> {
  const now = Date.now()

  if (configCache && now - lastCacheUpdate < CACHE_DURATION) {
    return configCache
  }

  try {
    const config = await prisma.systemConfig.findFirst()

    if (config) {
      configCache = config
      lastCacheUpdate = now
      return config
    }

    const defaultConfig = await prisma.systemConfig.create({
      data: {
        companyName: 'Restaurant',
        companyAddress: 'Dirección no configurada',
        companyPhone: 'Teléfono no configurado',
        companyRuc: 'RUC no configurado',
        taxRate: 0.18,
        currency: 'S/',
        timezone: 'America/Lima',
        lastBoletaNumber: 0,
        lastFacturaNumber: 0,
      },
    })

    configCache = defaultConfig
    lastCacheUpdate = now
    return defaultConfig
  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error)

    return {
      id: 'default',
      companyName: 'Restaurant',
      companyAddress: 'Dirección no configurada',
      companyPhone: 'Teléfono no configurado',
      companyRuc: 'RUC no configurado',
      taxRate: 0.18,
      currency: 'S/',
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
