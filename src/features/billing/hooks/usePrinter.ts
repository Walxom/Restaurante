"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import toast from "react-hot-toast"

export type PrinterServiceStatus = 'active' | 'inactive' | 'error' | 'checking'
export type PrinterHardwareStatus = 'connected' | 'disconnected' | 'busy' | 'error' | 'out_of_paper'

interface PrinterState {
  serviceStatus: PrinterServiceStatus
  hardwareStatus: PrinterHardwareStatus
  message: string
  errorCode?: string
  lastChecked: Date | null
  connectionType?: string
  isManualStopped: boolean
}

export function usePrinter(pollingInterval = 15000) {
  const [state, setState] = useState<PrinterState>({
    serviceStatus: 'checking',
    hardwareStatus: 'disconnected',
    message: 'Iniciando verificación...',
    lastChecked: null,
    isManualStopped: typeof window !== 'undefined' ? localStorage.getItem('thermal-print-manually-stopped') === 'true' : false
  })

  const [isLoading, setIsLoading] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const checkStatus = useCallback(async (showToast = false) => {
    try {
      const [serviceRes, hardwareRes] = await Promise.allSettled([
        fetch('/api/thermal-print/start-service'),
        fetch('/api/thermal-print/status')
      ])

      let newState: Partial<PrinterState> = {
        lastChecked: new Date()
      }

      // 1. Procesar Estado del Servicio (Software)
      if (serviceRes.status === 'fulfilled' && serviceRes.value.ok) {
        const serviceData = await serviceRes.value.json()
        // Ajuste para tu API: usa data.isRunning
        newState.serviceStatus = serviceData.data?.isRunning ? 'active' : 'inactive'
        newState.connectionType = serviceData.data?.connectionType || 'Servidor Local'
      } else {
        newState.serviceStatus = 'error'
      }

      // 2. Procesar Estado de la Impresora (Hardware)
      if (hardwareRes.status === 'fulfilled' && hardwareRes.value.ok) {
        const hardwareData = await hardwareRes.value.json()
        // Ajuste para tu API: usa hardwareData.success y hardwareData.message
        newState.hardwareStatus = hardwareData.success ? (hardwareData.status === 'ready' ? 'connected' : 'error') : 'error'
        newState.message = hardwareData.message || 'Error desconocido de hardware'
        newState.errorCode = hardwareData.errorCode
        
        if (hardwareData.errorCode === 'OUT_OF_PAPER') newState.hardwareStatus = 'out_of_paper'
      } else {
        newState.hardwareStatus = 'disconnected'
        newState.message = 'No se pudo conectar con la impresora'
      }

      setState(prev => ({ ...prev, ...newState }))

      if (showToast && newState.serviceStatus === 'active') {
        if (newState.hardwareStatus === 'connected') {
          toast.success('Servicio y hardware listos')
        } else {
          toast.error(`Servicio activo pero: ${newState.message}`)
        }
      }

    } catch (error) {
      console.error("Error al verificar estado de impresión:", error)
      setState(prev => ({ 
        ...prev, 
        serviceStatus: 'error', 
        hardwareStatus: 'error',
        message: 'Error de comunicación con el servidor'
      }))
    }
  }, [])

  const startService = async () => {
    setIsLoading(true)
    const toastId = toast.loading('Iniciando servicio de impresión...')
    try {
      const response = await fetch('/api/thermal-print/start-service', { method: 'POST' })
      const result = await response.json()

      if (response.ok) {
        localStorage.removeItem('thermal-print-manually-stopped')
        setState(prev => ({ ...prev, isManualStopped: false }))
        toast.success('Servicio iniciado correctamente', { id: toastId })
        await checkStatus()
      } else {
        throw new Error(result.error || 'Error al iniciar')
      }
    } catch (error) {
      toast.error('No se pudo iniciar el servicio', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const stopService = async () => {
    setIsLoading(true)
    const toastId = toast.loading('Deteniendo servicio...')
    try {
      const response = await fetch('/api/thermal-print/start-service', { method: 'DELETE' })
      if (response.ok) {
        localStorage.setItem('thermal-print-manually-stopped', 'true')
        setState(prev => ({ ...prev, isManualStopped: true, serviceStatus: 'inactive' }))
        toast.success('Servicio detenido', { id: toastId })
      }
    } catch (error) {
      toast.error('Error al detener el servicio', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const clearQueue = async () => {
    const toastId = toast.loading('Limpiando cola de impresión...')
    try {
      const response = await fetch('/api/thermal-print/monitor?action=clear', { method: 'POST' })
      if (response.ok) {
        toast.success('Cola de impresión limpia', { id: toastId })
      }
    } catch (error) {
      toast.error('Error al limpiar la cola', { id: toastId })
    }
  }

  // Polling dinámico
  useEffect(() => {
    checkStatus()
    
    pollingRef.current = setInterval(() => {
      // Solo hacer polling si no ha sido detenido manualmente o si está en error
      if (!state.isManualStopped || state.serviceStatus === 'error') {
        checkStatus()
      }
    }, pollingInterval)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [checkStatus, pollingInterval, state.isManualStopped, state.serviceStatus])

  return {
    ...state,
    isLoading,
    startService,
    stopService,
    checkStatus,
    clearQueue
  }
}
