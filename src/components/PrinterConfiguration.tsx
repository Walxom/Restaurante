'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Wifi,
  Bluetooth,
  ChefHat,
  Receipt
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PrinterCard } from '@/app/impresion/components/printer-card'

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
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState<{ [key: string]: boolean }>({})

  const [fiscalPrinter, setFiscalPrinter] = useState<BluetoothPrinterConfig>({
    id: 'fiscal',
    name: 'Impresora Fiscal',
    type: 'bluetooth',
    enabled: true,
    status: 'connected',
    port: 'COM7',
    baudRate: 115200
  })

  const [kitchenPrinter, setKitchenPrinter] = useState<NetworkPrinterConfig>({
    id: 'kitchen',
    name: 'Impresora de Cocina',
    type: 'network',
    enabled: true,
    status: 'connected',
    ip: '192.168.0.151',
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

  const savePrinterConfig = async (printerConfig: BluetoothPrinterConfig | NetworkPrinterConfig) => {
    try {
      setIsLoading(true)
      const saveToast = toast.loading('Sincronizando hardware...')

      const response = await fetch('/api/printer-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId: printerConfig.id, config: printerConfig })
      })

      if (response.ok) {
        toast.success('Configuración aplicada correctamente', { id: saveToast })
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      toast.error('Error al sincronizar configuración')
    } finally {
      setIsLoading(false)
    }
  }

  const testPrintTicket = async (printerId: string) => {
    try {
      setIsTesting(prev => ({ ...prev, [printerId]: true }))
      const testToast = toast.loading('Enviando pulso de impresión...')

      const config = printerId === 'kitchen' ? kitchenPrinter : fiscalPrinter

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
    } catch (error: any) {
      toast.error(`Fallo en hardware: ${error.message}`)
      updatePrinterStatus(printerId, 'error')
    } finally {
      setIsTesting(prev => ({ ...prev, [printerId]: false }))
    }
  }

  const updatePrinterStatus = (id: string, status: any) => {
    if (id === 'fiscal') setFiscalPrinter(prev => ({ ...prev, status }))
    else setKitchenPrinter(prev => ({ ...prev, status }))
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-1000">

      <Tabs defaultValue="kitchen" className="w-full">
        <TabsList className="flex w-full bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-2xl h-auto mb-8 shadow-sm">
          <TabsTrigger value="kitchen" className="flex-1 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
            <ChefHat className="w-3.5 h-3.5 mr-2" />
            Cocina (Red)
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="flex-1 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
            <Receipt className="w-3.5 h-3.5 mr-2" />
            Fiscal (BT)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kitchen" className="mt-0 outline-none">
          <PrinterCard
            title={kitchenPrinter.name}
            subtitle="Terminal de Órdenes TCP/IP"
            icon={Wifi}
            status={kitchenPrinter.status}
            enabled={kitchenPrinter.enabled}
            onEnabledChange={(checked) => setKitchenPrinter(prev => ({ ...prev, enabled: checked }))}
            onTest={() => testPrintTicket('kitchen')}
            onSave={() => savePrinterConfig(kitchenPrinter)}
            isTesting={isTesting.kitchen}
            isLoading={isLoading}
            technicalInfo={[
              { label: 'Modelo', value: 'ZJ-8360' },
              { label: 'Papel', value: '58mm' },
              { label: 'Protocolo', value: 'TCP Socket' }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dirección IP</Label>
                <Input
                  value={kitchenPrinter.ip}
                  onChange={(e) => setKitchenPrinter(prev => ({ ...prev, ip: e.target.value }))}
                  className="h-12 bg-background/50 border-border/50 rounded-2xl font-mono text-xs tracking-widest focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Puerto</Label>
                <Input
                  type="number"
                  value={kitchenPrinter.port}
                  onChange={(e) => setKitchenPrinter(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                  className="h-12 bg-background/50 border-border/50 rounded-2xl font-mono text-xs tracking-widest focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </PrinterCard>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-0 outline-none">
          <PrinterCard
            title={fiscalPrinter.name}
            subtitle="Terminal Fiscal Bluetooth"
            icon={Bluetooth}
            status={fiscalPrinter.status}
            enabled={fiscalPrinter.enabled}
            onEnabledChange={(checked) => setFiscalPrinter(prev => ({ ...prev, enabled: checked }))}
            onTest={() => testPrintTicket('fiscal')}
            onSave={() => savePrinterConfig(fiscalPrinter)}
            isTesting={isTesting.fiscal}
            isLoading={isLoading}
            technicalInfo={[
              { label: 'Tipo', value: 'BT/Serie' },
              { label: 'Papel', value: '80mm' },
              { label: 'Baud', value: fiscalPrinter.baudRate.toString() }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Puerto COM</Label>
                <Input
                  value={fiscalPrinter.port}
                  onChange={(e) => setFiscalPrinter(prev => ({ ...prev, port: e.target.value }))}
                  className="h-12 bg-background/50 border-border/50 rounded-2xl font-mono text-xs tracking-widest focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Baud Rate</Label>
                <Input
                  type="number"
                  value={fiscalPrinter.baudRate}
                  onChange={(e) => setFiscalPrinter(prev => ({ ...prev, baudRate: parseInt(e.target.value) || 115200 }))}
                  className="h-12 bg-background/50 border-border/50 rounded-2xl font-mono text-xs tracking-widest focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </PrinterCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
