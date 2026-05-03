// Interfaz para la configuración del sistema
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

// Monedas soportadas por el sistema
export const SUPPORTED_CURRENCIES = [
  { value: "PEN", label: "Soles (S/)" },
  { value: "USD", label: "Dólares ($)" },
  { value: "EUR", label: "Euros (€)" },
  { value: "CLP", label: "Peso Chileno ($)" },
  { value: "COP", label: "Peso Colombiano ($)" },
  { value: "MXN", label: "Peso Mexicano ($)" },
]

// Obtener lista de zonas horarias soportadas
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

/**
 * Hook para uso en componentes del cliente
 * Retorna la configuración desde el contexto o API
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

    // Configuración por defecto para el cliente
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
 * Obtiene información pública de la empresa (sin autenticación requerida)
 * Útil para páginas de login y otros componentes públicos
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

    // Información por defecto en caso de error
    return {
      companyName: 'Restaurant',
      currency: 'PEN'
    }
  }
}

