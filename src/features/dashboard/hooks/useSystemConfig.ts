import { useState, useEffect } from 'react'
import { type SystemConfigData, fetchSystemConfigForClient, fetchPublicCompanyInfo } from '@/services/system.service'

/**
 * Hook personalizado para obtener la configuración del sistema en el cliente
 */
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        setError(null)
        const systemConfig = await fetchSystemConfigForClient()
        setConfig(systemConfig)
      } catch (err) {
        setError('Error al cargar configuración del sistema')
        console.error('Error loading system config:', err)
        
        // Configuración por defecto en caso de error
        setConfig({
          id: 'default',
          companyName: 'Restaurant',
          companyAddress: 'Dirección no configurada',
          companyPhone: 'Teléfono no configurado',
          companyRuc: 'RUC no configurado',
          taxRate: 0.18,
          currency: 'S/',
          timezone: 'America/Lima',
          lastBoletaNumber: 0,
          lastFacturaNumber: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const systemConfig = await fetchSystemConfigForClient()
      setConfig(systemConfig)
    } catch (err) {
      setError('Error al cargar configuración del sistema')
      console.error('Error loading system config:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    const currencyCode = config?.currency || 'PEN'
    
    // Si por alguna razón tenemos el símbolo en lugar del código (ej: migración)
    // intentamos usar PEN como fallback para evitar errores en Intl
    const safeCurrencyCode = /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : 'PEN'
    
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: safeCurrencyCode,
    }).format(value)
  }

  return { config, loading, error, refetch, formatCurrency }
}

/**
 * Hook simplificado para obtener solo el nombre de la empresa
 */
export function useCompanyName() {
  const { config, loading, error } = useSystemConfig()
  
  return {
    companyName: config?.companyName || 'Restaurant',
    loading,
    error
  }
}

/**
 * Hook para obtener información pública de la empresa (sin autenticación)
 * Útil para páginas de login y otros componentes públicos
 */
export function usePublicCompanyInfo() {
  const [companyName, setCompanyName] = useState('')
  const [currency, setCurrency] = useState('S/')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPublicInfo = async () => {
      try {
        setLoading(true)
        setError(null)
        const info = await fetchPublicCompanyInfo()
        setCompanyName(info.companyName)
        setCurrency(info.currency)
      } catch (err) {
        setError('Error al cargar información de la empresa')
        console.error('Error loading public company info:', err)
        
        // Mantener valores por defecto en caso de error
        setCompanyName('Restaurant')
        setCurrency('S/')
      } finally {
        setLoading(false)
      }
    }

    loadPublicInfo()
  }, [])

  return { companyName, currency, loading, error }
}
