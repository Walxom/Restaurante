'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Receipt, FileText, X, Search, CheckCircle, Check } from 'lucide-react'

interface CompleteOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (receiptType: 'none' | 'boleta' | 'factura', customerData?: {
    name: string
    document: string
    ruc?: string
  }) => Promise<string>
  orderNumber: string
  totalAmount: number
}

export default function CompleteOrderModal({
  isOpen,
  onClose,
  onComplete,
  orderNumber,
  totalAmount
}: CompleteOrderModalProps) {
  const [selectedType, setSelectedType] = useState<'none' | 'boleta' | 'factura' | null>(null)
  const [customerData, setCustomerData] = useState({
    name: '',
    document: '',
    ruc: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerifyingRuc, setIsVerifyingRuc] = useState(false)
  const [isDniVerified, setIsDniVerified] = useState(false)
  const [isRucVerified, setIsRucVerified] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState('')

  // ✅ Verificar DNI usando nuestra API interna
  const handleVerifyDNI = async () => {
    if (!customerData.document.trim() || customerData.document.length !== 8) {
      alert('Por favor ingrese un DNI válido de 8 dígitos')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/customers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'dni',
          numero: customerData.document
        })
      })
      
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Error al verificar el DNI')
        return
      }

      setCustomerData(prev => ({
        ...prev,
        name: result.data.nombreCompleto
      }))
      setIsDniVerified(true)
    } catch (error) {
      console.error(error)
      alert('Error de conexión al verificar el DNI. Intente nuevamente.')
      setIsDniVerified(false)
    } finally {
      setIsVerifying(false)
    }
  }

  // ✅ Verificar RUC usando nuestra API interna
  const handleVerifyRUC = async () => {
    if (!customerData.ruc.trim() || customerData.ruc.length !== 11) {
      alert('Por favor ingrese un RUC válido de 11 dígitos')
      return
    }

    setIsVerifyingRuc(true)
    try {
      const response = await fetch('/api/customers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'ruc',
          numero: customerData.ruc
        })
      })
      
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Error al verificar el RUC')
        return
      }

      setCustomerData(prev => ({
        ...prev,
        name: result.data.razonSocial
      }))
      setIsRucVerified(true)
    } catch (error) {
      console.error(error)
      alert('Error de conexión al verificar el RUC. Intente nuevamente.')
      setIsRucVerified(false)
    } finally {
      setIsVerifyingRuc(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedType) return
    
    // Validaciones antes de procesar
    if (selectedType === 'boleta') {
      if (!customerData.document.trim()) {
        console.log('Validación fallida: DNI requerido')
        return
      }
      if (!customerData.name.trim()) {
        console.log('Validación fallida: DNI no verificado')
        return
      }
    }

    if (selectedType === 'factura') {
      if (!customerData.ruc.trim()) {
        console.log('Validación fallida: RUC requerido')
        return
      }
      if (!customerData.name.trim()) {
        console.log('Validación fallida: RUC no verificado')
        return
      }
    }

    setIsProcessing(true)

    try {
      if (selectedType === 'none') {
        await onComplete('none')
        // Para pedidos sin comprobante, mostrar éxito simple
        setShowSuccess(true)
        setReceiptNumber('')
      } else {
        // onComplete ahora retorna el número de comprobante
        const receiptNum = await onComplete(selectedType, {
          name: customerData.name,
          document: customerData.document,
          ruc: selectedType === 'factura' ? customerData.ruc : undefined
        })

        // Usar el número de comprobante real retornado por la API
        setReceiptNumber(receiptNum || '')
        setShowSuccess(true)
        
        console.log('Mostrando pantalla de éxito con número:', receiptNum)
      }
    } catch (error) {
      console.error('Error al completar pedido:', error)
      // En caso de error, no mostrar la pantalla de éxito
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedType(null)
    setCustomerData({ name: '', document: '', ruc: '' })
    setIsDniVerified(false)
    setIsRucVerified(false)
    setShowSuccess(false)
    setReceiptNumber('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Completar Pedido #{orderNumber}</span>
            <span className="sm:hidden">Pedido #{orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          /* Pantalla de éxito */
          <div className="text-center py-4 sm:py-8 space-y-4 sm:space-y-6">
            {/* Animación del check */}
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-green-500 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                <Check className="h-8 w-8 sm:h-10 sm:w-10 text-white animate-bounce" />
              </div>
            </div>

            {/* Mensaje de éxito */}
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-green-600">
                ¡Pedido completado exitosamente!
              </h3>
              {receiptNumber && (
                <div className="space-y-1">
                  <p className="text-sm sm:text-base text-gray-600">Boleta generada:</p>
                  <p className="text-sm sm:text-lg font-mono font-bold text-green-700 bg-green-50 px-3 sm:px-4 py-2 rounded-lg border border-green-200 break-all">
                    {receiptNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-green-700">Pedido #{orderNumber}</span>
                <span className="font-bold text-green-800">S/ {Number(totalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Botón para cerrar manualmente */}
            <Button 
              onClick={() => {
                setShowSuccess(false)
                handleClose()
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm sm:text-base"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Resumen del pedido */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base font-medium">Total a cobrar:</span>
                <span className="text-lg sm:text-xl font-bold text-green-600">
                  S/ {Number(totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

          {/* Selección de tipo de comprobante */}
          <div>
            <Label className="text-sm sm:text-base font-medium mb-3 block">
              ¿El cliente desea comprobante?
            </Label>
            
            <div className="grid gap-2 sm:gap-3">
              {/* Sin comprobante */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === 'none' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setSelectedType('none')}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                    <div>
                      <div className="text-sm sm:text-base font-medium">Sin comprobante</div>
                      <div className="text-xs sm:text-sm text-gray-600">Solo completar el pedido</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boleta */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === 'boleta' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setSelectedType('boleta')}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                    <div>
                      <div className="text-sm sm:text-base font-medium">Boleta</div>
                      <div className="text-xs sm:text-sm text-gray-600">Para consumidor final (requiere DNI)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Factura */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === 'factura' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setSelectedType('factura')}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    <div>
                      <div className="text-sm sm:text-base font-medium">Factura</div>
                      <div className="text-xs sm:text-sm text-gray-600">Para empresas (requiere RUC)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Datos del cliente */}
          {selectedType && selectedType !== 'none' && (
            <div className="space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4">
              <Label className="text-sm sm:text-base font-medium">Datos del cliente</Label>
              
              <div className="space-y-3">
                {selectedType === 'boleta' && (
                  <>
                    <div>
                      <Label htmlFor="customerDocument" className="text-xs sm:text-sm">DNI *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="customerDocument"
                          value={customerData.document}
                          onChange={(e) => {
                            setCustomerData(prev => ({ ...prev, document: e.target.value }))
                            setIsDniVerified(false) // Reset verification when DNI changes
                          }}
                          placeholder="12345678"
                          maxLength={8}
                          className={`mt-1 flex-1 text-sm ${isDniVerified ? 'border-green-500 bg-green-50' : ''}`}
                        />
                        <Button 
                          onClick={handleVerifyDNI} 
                          disabled={isVerifying || customerData.document.length !== 8}
                          className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 rounded-xl"
                        >
                          {isVerifying ? (
                            <span className="hidden sm:inline">Verificando...</span>
                          ) : (
                            <>
                              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
                              <span className="hidden sm:inline">Verificar</span>
                              <span className="sm:hidden">Ver</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customerName" className="text-xs sm:text-sm">Nombre completo *</Label>
                      <div className="relative">
                        <Input
                          id="customerName"
                          value={customerData.name}
                          disabled
                          placeholder="Nombre se autocompletará al verificar DNI"
                          className={`mt-1 text-sm ${isDniVerified ? 'bg-green-50 border-green-500 text-green-800 font-medium' : 'bg-gray-100'}`}
                        />
                        {isDniVerified && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedType === 'factura' && (
                  <>
                    <div>
                      <Label htmlFor="customerRuc" className="text-xs sm:text-sm">RUC *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="customerRuc"
                          value={customerData.ruc}
                          onChange={(e) => {
                            setCustomerData(prev => ({ ...prev, ruc: e.target.value }))
                            setIsRucVerified(false) // Reset verification when RUC changes
                          }}
                          placeholder="20123456789"
                          maxLength={11}
                          className={`mt-1 flex-1 text-sm ${isRucVerified ? 'border-green-500 bg-green-50' : ''}`}
                        />
                        <Button 
                          onClick={handleVerifyRUC} 
                          disabled={isVerifyingRuc || customerData.ruc.length !== 11}
                          className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 rounded-xl"
                        >
                          {isVerifyingRuc ? (
                            <span className="hidden sm:inline">Verificando...</span>
                          ) : (
                            <>
                              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
                              <span className="hidden sm:inline">Verificar</span>
                              <span className="sm:hidden">Ver</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customerName" className="text-xs sm:text-sm">Razón Social *</Label>
                      <div className="relative">
                        <Input
                          id="customerName"
                          value={customerData.name}
                          disabled
                          placeholder="Razón social se autocompletará al verificar RUC"
                          className={`mt-1 text-sm ${isRucVerified ? 'bg-green-50 border-green-500 text-green-800 font-medium' : 'bg-gray-100'}`}
                        />
                        {isRucVerified && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="customerDocument" className="text-xs sm:text-sm">DNI del representante (opcional)</Label>
                      <Input
                        id="customerDocument"
                        value={customerData.document}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, document: e.target.value }))}
                        placeholder="12345678"
                        maxLength={8}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

            {/* Botones */}
            <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 rounded-xl text-xs sm:text-sm"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!selectedType || isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl text-xs sm:text-sm"
              >
                {isProcessing ? (
                  <span className="hidden sm:inline">Procesando...</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Completar Pedido</span>
                    <span className="sm:hidden">Completar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
