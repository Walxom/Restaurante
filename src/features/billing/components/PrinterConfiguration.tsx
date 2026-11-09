'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Wifi,
  Bluetooth,
  ChefHat,
  Receipt,
  Globe,
  Cpu,
  Terminal,
  Activity,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PrinterCard } from './PrinterCard'
import { ConfigField } from '@/features/dashboard/components/form-utils'
import { printerConfigSchema } from '@/features/billing/validations/printer-config'
import { usePrinter } from '@/features/billing/hooks/usePrinter'

interface PrinterConfig {
  id: string
  name: string
  type: 'bluetooth' | 'network'
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error' | 'testing'
}

interface BluetoothPrinterConfig extends PrinterConfig {
  type: 'bluetooth'
  port: string
  baudRate: number
}

interface NetworkPrinterConfig extends PrinterConfig {
  type: 'network'
  ip: string
  port: number
  timeout: number
}

export default function PrinterConfiguration() {
  const { hardwareStatus, serviceStatus } = usePrinter()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState<{ [key: string]: boolean }>({})
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({
    kitchen: {},
    fiscal: {}
  })

  const [fiscalPrinter, setFiscalPrinter] = useState<BluetoothPrinterConfig>({
    id: 'fiscal',
    name: 'Impresora Fiscal',
    type: 'bluetooth',
    enabled: true,
    status: 'disconnected',
    port: 'COM7',
    baudRate: 115200
  })

  const [kitchenPrinter, setKitchenPrinter] = useState<NetworkPrinterConfig>({
    id: 'kitchen',
    name: 'Cocina Principal',
    type: 'network',
    enabled: true,
    status: 'disconnected',
    ip: '192.168.0.100',
    port: 9100,
    timeout: 5000
  })

  useEffect(() => {
    loadPrinterConfigs()
  }, [])

  const loadPrinterConfigs = async () => {
    try {
      const response = await fetch('/api/printer-config')
      if (response.ok) {
        const configs = await response.json()
        if (configs.fiscal) setFiscalPrinter(prev => ({ ...prev, ...configs.fiscal }))
        if (configs.kitchen) setKitchenPrinter(prev => ({ ...prev, ...configs.kitchen }))
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
    }
  }

  const handleKitchenChange = (field: keyof NetworkPrinterConfig, value: string | number | boolean) => {
    setKitchenPrinter(prev => ({ ...prev, [field]: value }))
    if (errors.kitchen[field]) {
      setErrors(prev => {
        const updated = { ...prev }
        updated.kitchen = { ...updated.kitchen }
        delete updated.kitchen[field]
        return updated
      })
    }
  }

  const handleFiscalChange = (field: keyof BluetoothPrinterConfig, value: string | number | boolean) => {
    setFiscalPrinter(prev => ({ ...prev, [field]: value }))
    if (errors.fiscal[field]) {
      setErrors(prev => {
        const updated = { ...prev }
        updated.fiscal = { ...updated.fiscal }
        delete updated.fiscal[field]
        return updated
      })
    }
  }

  const savePrinterConfig = async (printerConfig: BluetoothPrinterConfig | NetworkPrinterConfig) => {
    const validationResult = printerConfigSchema.safeParse({
      printerId: printerConfig.id,
      config: printerConfig
    })

    if (!validationResult.success) {
      const validationErrors: Record<string, string> = {}
      validationResult.error.issues.forEach(err => {
        if (err.path[0] === 'config' && err.path[1]) {
          validationErrors[err.path[1] as string] = err.message
        }
      })
      setErrors(prev => ({
        ...prev,
        [printerConfig.id]: validationErrors
      }))
      toast.error('Corrige los campos marcados en rojo')
      return
    }

    setErrors(prev => ({ ...prev, [printerConfig.id]: {} }))

    try {
      setIsLoading(true)
      const saveToast = toast.loading('Guardando configuración...')

      const response = await fetch('/api/printer-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data)
      })

      if (response.ok) {
        toast.success('Configuración guardada correctamente', { id: saveToast })
      } else {
        const errData = await response.json()
        throw new Error(errData.error || 'Error al guardar')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al sincronizar configuración'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const testPrintTicket = async (printerId: string) => {
    try {
      setIsTesting(prev => ({ ...prev, [printerId]: true }))
      const testToast = toast.loading('Enviando prueba de impresión...')

      const response = await fetch('/api/printer-print-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printerId,
          ip: printerId === 'kitchen' ? kitchenPrinter.ip : undefined,
          port: printerId === 'kitchen' ? kitchenPrinter.port : undefined,
          fiscalPort: printerId === 'fiscal' ? fiscalPrinter.port : undefined,
          baudRate: printerId === 'fiscal' ? fiscalPrinter.baudRate : undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Impresión exitosa: ${result.message}`, { id: testToast })
        updatePrinterStatus(printerId, 'connected')
      } else {
        throw new Error(result.error)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Fallo en hardware: ${message}`)
      updatePrinterStatus(printerId, 'error')
    } finally {
      setIsTesting(prev => ({ ...prev, [printerId]: false }))
    }
  }

  const updatePrinterStatus = (id: string, status: 'connected' | 'disconnected' | 'error' | 'testing') => {
    if (id === 'fiscal') setFiscalPrinter(prev => ({ ...prev, status }))
    else setKitchenPrinter(prev => ({ ...prev, status }))
  }

  // Estado sincronizado de la cocina con el controlador
  const computedKitchenStatus: 'connected' | 'disconnected' | 'error' | 'testing' = isTesting.kitchen
    ? 'testing'
    : serviceStatus === 'active' && hardwareStatus === 'connected'
    ? 'connected'
    : hardwareStatus === 'disconnected' || serviceStatus === 'inactive'
    ? 'disconnected'
    : kitchenPrinter.status

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <Tabs defaultValue="kitchen" className="w-full">
        {/* Selector de Pestañas Integrado */}
        <TabsList className="flex w-full bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-2xl h-auto mb-4 shadow-sm">
          <TabsTrigger 
            value="kitchen" 
            className="flex-1 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md shadow-primary/20 gap-2"
          >
            <ChefHat className="w-4 h-4" />
            <span>Cocina Principal</span>
          </TabsTrigger>
          <TabsTrigger 
            value="fiscal" 
            className="flex-1 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md shadow-primary/20 gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Impresora Fiscal</span>
          </TabsTrigger>
        </TabsList>

        {/* Pestaña: Impresora de Cocina */}
        <TabsContent value="kitchen" className="mt-0 outline-none">
          <PrinterCard
            title={kitchenPrinter.name}
            subtitle="Terminal de comandas TCP/IP"
            icon={Wifi}
            status={computedKitchenStatus}
            enabled={kitchenPrinter.enabled}
            onEnabledChange={(checked) => setKitchenPrinter(prev => ({ ...prev, enabled: checked }))}
            onTest={() => testPrintTicket('kitchen')}
            onSave={() => savePrinterConfig(kitchenPrinter)}
            isTesting={isTesting.kitchen}
            isLoading={isLoading}
            technicalInfo={[
              { label: 'Modelo', value: 'ZJ-8360' },
              { label: 'Papel', value: '58 mm' },
              { label: 'Protocolo', value: 'TCP Socket' }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ConfigField id="kitchenIp" label="Dirección IP" icon={Globe} error={errors.kitchen.ip}>
                <Input
                  id="kitchenIp"
                  value={kitchenPrinter.ip}
                  onChange={(e) => handleKitchenChange("ip", e.target.value)}
                  disabled={isLoading}
                  placeholder="192.168.0.100"
                  data-testid="input-printer-ip"
                  className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl font-mono text-xs tracking-wider focus:ring-primary/20 transition-all font-semibold"
                />
              </ConfigField>

              <ConfigField id="kitchenPort" label="Puerto TCP" icon={Cpu} error={errors.kitchen.port}>
                <Input
                  id="kitchenPort"
                  type="number"
                  value={kitchenPrinter.port || ""}
                  onChange={(e) => handleKitchenChange("port", parseInt(e.target.value, 10) || 0)}
                  disabled={isLoading}
                  placeholder="9100"
                  data-testid="input-printer-port"
                  className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl font-mono text-xs tracking-wider focus:ring-primary/20 transition-all font-semibold"
                />
              </ConfigField>

              <ConfigField id="kitchenTimeout" label="Tiempo de espera (ms)" icon={Zap} error={errors.kitchen.timeout}>
                <Input
                  id="kitchenTimeout"
                  type="number"
                  value={kitchenPrinter.timeout || ""}
                  onChange={(e) => handleKitchenChange("timeout", parseInt(e.target.value, 10) || 0)}
                  disabled={isLoading}
                  placeholder="5000"
                  data-testid="input-printer-timeout"
                  className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl font-mono text-xs tracking-wider focus:ring-primary/20 transition-all font-semibold"
                />
              </ConfigField>
            </div>
          </PrinterCard>
        </TabsContent>

        {/* Pestaña: Impresora Fiscal */}
        <TabsContent value="fiscal" className="mt-0 outline-none">
          <PrinterCard
            title={fiscalPrinter.name}
            subtitle="Terminal fiscal Bluetooth / Serie"
            icon={Bluetooth}
            status={isTesting.fiscal ? 'testing' : fiscalPrinter.status}
            enabled={fiscalPrinter.enabled}
            onEnabledChange={(checked) => setFiscalPrinter(prev => ({ ...prev, enabled: checked }))}
            onTest={() => testPrintTicket('fiscal')}
            onSave={() => savePrinterConfig(fiscalPrinter)}
            isTesting={isTesting.fiscal}
            isLoading={isLoading}
            technicalInfo={[
              { label: 'Tipo', value: 'Bluetooth / Serie' },
              { label: 'Papel', value: '80 mm' },
              { label: 'Baud Rate', value: fiscalPrinter.baudRate.toString() }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ConfigField id="fiscalPort" label="Puerto COM" icon={Terminal} error={errors.fiscal.port}>
                <Input
                  id="fiscalPort"
                  value={fiscalPrinter.port}
                  onChange={(e) => handleFiscalChange("port", e.target.value)}
                  disabled={isLoading}
                  placeholder="COM7"
                  data-testid="input-printer-com"
                  className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl font-mono text-xs tracking-wider focus:ring-primary/20 transition-all font-semibold"
                />
              </ConfigField>

              <ConfigField id="fiscalBaud" label="Velocidad (Baud Rate)" icon={Activity} error={errors.fiscal.baudRate}>
                <Input
                  id="fiscalBaud"
                  type="number"
                  value={fiscalPrinter.baudRate || ""}
                  onChange={(e) => handleFiscalChange("baudRate", parseInt(e.target.value, 10) || 0)}
                  disabled={isLoading}
                  placeholder="115200"
                  data-testid="input-printer-baud"
                  className="pl-11 h-11 bg-background/50 border-border/50 rounded-xl font-mono text-xs tracking-wider focus:ring-primary/20 transition-all font-semibold"
                />
              </ConfigField>
            </div>
          </PrinterCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
