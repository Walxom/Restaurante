'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wifi, 
  Bluetooth, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ChefHat,
  Receipt
} from 'lucide-react'
import toast from 'react-hot-toast'

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
  
  // Configuración de la impresora fiscal (Bluetooth)
  const [fiscalPrinter, setFiscalPrinter] = useState<BluetoothPrinterConfig>({
    id: 'fiscal',
    name: 'Impresora Fiscal',
    type: 'bluetooth',
    enabled: true,
    status: 'connected',
    port: 'COM7',
    baudRate: 115200
  })

  // Configuración de la impresora de cocina (TCP/IP)
  const [kitchenPrinter, setKitchenPrinter] = useState<NetworkPrinterConfig>({
    id: 'kitchen',
    name: 'Impresora de Cocina ZJ-8360',
    type: 'network',
    enabled: true,
    status: 'connected',
    ip: '192.168.0.151', // Valor inicial que se actualizará desde la BD
    port: 9100,
    timeout: 5000
  })

  // Cargar configuración al inicializar
  useEffect(() => {
    loadPrinterConfigs()
  }, [])

  const loadPrinterConfigs = async () => {
    try {
      const response = await fetch('/api/printer-config')
      if (response.ok) {
        const configs = await response.json()
        if (configs.fiscal) {
          setFiscalPrinter(prev => ({ ...prev, ...configs.fiscal }))
        }
        if (configs.kitchen) {
          setKitchenPrinter(prev => ({ ...prev, ...configs.kitchen }))
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de impresoras:', error)
    }
  }

  const savePrinterConfig = async (printerConfig: BluetoothPrinterConfig | NetworkPrinterConfig) => {
    try {
      setIsLoading(true)
      toast.loading('Guardando configuración...', { id: 'save-config' })

      const response = await fetch('/api/printer-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId: printerConfig.id,
          config: printerConfig
        })
      })

      if (response.ok) {
        toast.success('Configuración guardada exitosamente', { id: 'save-config' })
      } else {
        throw new Error('Error al guardar configuración')
      }
    } catch (error) {
      toast.error('Error al guardar configuración', { id: 'save-config' })
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testPrintTicket = async (printerId: string) => {
    try {
      setIsTesting(prev => ({ ...prev, [printerId]: true }))
      toast.loading('Enviando ticket de prueba...', { id: `test-${printerId}` })
      
      const response = await fetch('/api/printer-print-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId: printerId,
          // Para impresora de cocina
          ip: printerId === 'kitchen' ? kitchenPrinter.ip : undefined,
          port: printerId === 'kitchen' ? kitchenPrinter.port : undefined,
          // Para impresora fiscal
          fiscalPort: printerId === 'fiscal' ? fiscalPrinter.port : undefined,
          baudRate: printerId === 'fiscal' ? fiscalPrinter.baudRate : undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`✅ ${result.message}`, { id: `test-${printerId}` })
        
        // Actualizar estado de la impresora
        if (printerId === 'fiscal') {
          setFiscalPrinter(prev => ({ ...prev, status: 'connected' }))
        } else if (printerId === 'kitchen') {
          setKitchenPrinter(prev => ({ ...prev, status: 'connected' }))
        }
      } else {
        throw new Error(result.error || 'Error en la prueba de impresión')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`❌ Error: ${errorMessage}`, { id: `test-${printerId}` })
      
      // Actualizar estado de error
      if (printerId === 'fiscal') {
        setFiscalPrinter(prev => ({ ...prev, status: 'error' }))
      } else if (printerId === 'kitchen') {
        setKitchenPrinter(prev => ({ ...prev, status: 'error' }))
      }
    } finally {
      setIsTesting(prev => ({ ...prev, [printerId]: false }))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'testing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return <Badge variant="secondary">Deshabilitada</Badge>
    }
    
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Conectada</Badge>
      case 'disconnected':
        return <Badge variant="secondary">Desconectada</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'testing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Probando...</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header responsivo */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 flex-shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Configuración de Impresoras</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">Configura y gestiona las impresoras del sistema</p>
      </div>

      <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200">
        <Tabs defaultValue="kitchen" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="kitchen" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Cocina</span>
              <span className="xs:hidden">TCP</span>
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Fiscal</span>
              <span className="xs:hidden">BT</span>
            </TabsTrigger>
          </TabsList>

          {/* Configuración Impresora de Cocina */}
          <TabsContent value="kitchen" className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                  <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{kitchenPrinter.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Impresora de red TCP/IP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusIcon(kitchenPrinter.status)}
                  {getStatusBadge(kitchenPrinter.status, kitchenPrinter.enabled)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="kitchen-name" className="text-xs sm:text-sm">Nombre de la Impresora</Label>
                    <Input
                      id="kitchen-name"
                      value={kitchenPrinter.name}
                      onChange={(e) => setKitchenPrinter(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Impresora Cocina Principal"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="kitchen-ip" className="text-xs sm:text-sm">Dirección IP</Label>
                    <Input
                      id="kitchen-ip"
                      value={kitchenPrinter.ip}
                      onChange={(e) => setKitchenPrinter(prev => ({ ...prev, ip: e.target.value }))}
                      placeholder="192.168.0.150"
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      IP estática de la impresora en la red local
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="kitchen-port" className="text-xs sm:text-sm">Puerto TCP</Label>
                    <Input
                      id="kitchen-port"
                      type="number"
                      value={kitchenPrinter.port}
                      onChange={(e) => setKitchenPrinter(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                      placeholder="9100"
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Puerto estándar: 9100
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="kitchen-timeout" className="text-xs sm:text-sm">Timeout (ms)</Label>
                    <Input
                      id="kitchen-timeout"
                      type="number"
                      value={kitchenPrinter.timeout}
                      onChange={(e) => setKitchenPrinter(prev => ({ ...prev, timeout: parseInt(e.target.value) || 5000 }))}
                      placeholder="5000"
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo límite de conexión en milisegundos
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="kitchen-enabled"
                    checked={kitchenPrinter.enabled}
                    onCheckedChange={(checked: boolean) => setKitchenPrinter(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="kitchen-enabled" className="text-xs sm:text-sm">Habilitar impresora de cocina</Label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => testPrintTicket('kitchen')}
                  disabled={isTesting.kitchen || !kitchenPrinter.enabled}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {isTesting.kitchen ? 'Enviando...' : 'Imprimir Prueba'}
                </Button>
                
                <Button
                  onClick={() => savePrinterConfig(kitchenPrinter)}
                  disabled={isLoading}
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Guardar Configuración
                </Button>
              </div>
            </div>

            {/* Información técnica responsive */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">Información Técnica</h4>
              <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                <div>• <strong>Modelo:</strong> ZJ-8360 (TCP/IP)</div>
                <div>• <strong>Protocolo:</strong> ESC/POS sobre TCP Socket</div>
                <div>• <strong>Papel:</strong> 58mm térmico</div>
                <div>• <strong>Función:</strong> Tickets de órdenes para cocina</div>
                <div>• <strong>Características:</strong> Corte automático, beep de notificación</div>
              </div>
            </div>
          </TabsContent>

          {/* Configuración Impresora Fiscal */}
          <TabsContent value="fiscal" className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                  <Bluetooth className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{fiscalPrinter.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Impresora Bluetooth para boletas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusIcon(fiscalPrinter.status)}
                  {getStatusBadge(fiscalPrinter.status, fiscalPrinter.enabled)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fiscal-name" className="text-xs sm:text-sm">Nombre de la Impresora</Label>
                    <Input
                      id="fiscal-name"
                      value={fiscalPrinter.name}
                      onChange={(e) => setFiscalPrinter(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Impresora Fiscal Principal"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fiscal-port" className="text-xs sm:text-sm">Puerto COM</Label>
                    <Input
                      id="fiscal-port"
                      value={fiscalPrinter.port}
                      onChange={(e) => setFiscalPrinter(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="COM7"
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Puerto serie de la impresora Bluetooth
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fiscal-baudrate" className="text-xs sm:text-sm">Velocidad (Baud Rate)</Label>
                    <Input
                      id="fiscal-baudrate"
                      type="number"
                      value={fiscalPrinter.baudRate}
                      onChange={(e) => setFiscalPrinter(prev => ({ ...prev, baudRate: parseInt(e.target.value) || 115200 }))}
                      placeholder="115200"
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Velocidad de comunicación (bits por segundo)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fiscal-enabled"
                    checked={fiscalPrinter.enabled}
                    onCheckedChange={(checked: boolean) => setFiscalPrinter(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="fiscal-enabled" className="text-xs sm:text-sm">Habilitar impresora fiscal</Label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => testPrintTicket('fiscal')}
                  disabled={isTesting.fiscal || !fiscalPrinter.enabled}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {isTesting.fiscal ? 'Enviando...' : 'Imprimir Prueba'}
                </Button>
                
                <Button
                  onClick={() => savePrinterConfig(fiscalPrinter)}
                  disabled={isLoading}
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Guardar Configuración
                </Button>
              </div>
            </div>

            {/* Información técnica responsive */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Información Técnica</h4>
              <div className="text-xs sm:text-sm text-green-700 space-y-1">
                <div>• <strong>Conexión:</strong> Bluetooth/Serie</div>
                <div>• <strong>Protocolo:</strong> ESC/POS</div>
                <div>• <strong>Papel:</strong> 80mm térmico</div>
                <div>• <strong>Función:</strong> Boletas, facturas y recibos fiscales</div>
                <div>• <strong>Estado:</strong> Sistema principal en funcionamiento</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
