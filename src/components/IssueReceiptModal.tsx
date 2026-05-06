'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Receipt, FileText, Search, CheckCircle } from 'lucide-react'

interface IssueReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onIssue: (receiptType: 'boleta' | 'factura', customerData: {
    name: string
    document: string
    ruc?: string
  }) => void
  orderNumber: string
  totalAmount: number
}

export default function IssueReceiptModal({
  isOpen,
  onClose,
  onIssue,
  orderNumber,
  totalAmount
}: IssueReceiptModalProps) {
  const [selectedType, setSelectedType] = useState<'boleta' | 'factura' | null>(null)
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

  // Verificar DNI usando nuestra API interna
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

  // Verificar RUC usando nuestra API interna
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

  const handleIssue = async () => {
    if (!selectedType) return
    
    // Validaciones antes de procesar
    if (selectedType === 'boleta') {
      if (!customerData.document.trim()) {
        alert('Por favor ingrese el DNI del cliente')
        return
      }
      if (!customerData.name.trim()) {
        alert('Por favor verifique el DNI para obtener el nombre del cliente')
        return
      }
    }

    if (selectedType === 'factura') {
      if (!customerData.ruc.trim()) {
        alert('Por favor ingrese el RUC de la empresa')
        return
      }
      if (!customerData.name.trim()) {
        alert('Por favor verifique el RUC para obtener la razón social')
        return
      }
    }

    setIsProcessing(true)

    try {
      await onIssue(selectedType, {
        name: customerData.name,
        document: customerData.document,
        ruc: selectedType === 'factura' ? customerData.ruc : undefined
      })
      
      // Cerrar modal después de emitir
      handleClose()
    } catch (error) {
      console.error('Error al emitir comprobante:', error)
      alert('Error al emitir el comprobante. Intente nuevamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedType(null)
    setCustomerData({ name: '', document: '', ruc: '' })
    setIsDniVerified(false)
    setIsRucVerified(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isFormValid = () => {
    if (selectedType === 'boleta') {
      return customerData.document.trim() && customerData.name.trim() && isDniVerified
    }
    if (selectedType === 'factura') {
      return customerData.ruc.trim() && customerData.name.trim() && isRucVerified
    }
    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Emitir Comprobante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del pedido */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Pedido #{orderNumber}</div>
            <div className="font-semibold text-lg">Total: S/ {Number(totalAmount).toFixed(2)}</div>
          </div>

          {/* Selección de tipo de comprobante */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Comprobante</Label>
            
            {/* Boleta */}
            <Card 
              className={`cursor-pointer transition-all ${
                selectedType === 'boleta' 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedType('boleta')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-6 w-6 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">Boleta de Venta</div>
                    <div className="text-sm text-gray-600">Para personas naturales (DNI)</div>
                  </div>
                  {selectedType === 'boleta' && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Factura */}
            <Card 
              className={`cursor-pointer transition-all ${
                selectedType === 'factura' 
                  ? 'ring-2 ring-green-500 bg-green-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedType('factura')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">Factura</div>
                    <div className="text-sm text-gray-600">Para empresas (RUC)</div>
                  </div>
                  {selectedType === 'factura' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de datos del cliente */}
          {selectedType === 'boleta' && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Datos del Cliente</Label>
              
              <div className="space-y-2">
                <Label htmlFor="document">DNI</Label>
                <div className="flex gap-2">
                  <Input
                    id="document"
                    placeholder="12345678"
                    value={customerData.document}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setCustomerData(prev => ({ ...prev, document: value }))
                      setIsDniVerified(false)
                    }}
                    maxLength={8}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyDNI}
                    disabled={isVerifying || customerData.document.length !== 8}
                    className="px-3"
                  >
                    {isVerifying ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    placeholder="Nombre del cliente"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                    disabled={isDniVerified}
                  />
                  {isDniVerified && (
                    <div className="flex items-center px-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedType === 'factura' && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Datos de la Empresa</Label>
              
              <div className="space-y-2">
                <Label htmlFor="ruc">RUC</Label>
                <div className="flex gap-2">
                  <Input
                    id="ruc"
                    placeholder="12345678901"
                    value={customerData.ruc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setCustomerData(prev => ({ ...prev, ruc: value }))
                      setIsRucVerified(false)
                    }}
                    maxLength={11}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyRUC}
                    disabled={isVerifyingRuc || customerData.ruc.length !== 11}
                    className="px-3"
                  >
                    {isVerifyingRuc ? (
                      <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-name">Razón Social</Label>
                <div className="flex gap-2">
                  <Input
                    id="company-name"
                    placeholder="Razón social de la empresa"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                    disabled={isRucVerified}
                  />
                  {isRucVerified && (
                    <div className="flex items-center px-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleIssue}
              disabled={!isFormValid() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Emitiendo...
                </div>
              ) : (
                `Emitir ${selectedType === 'boleta' ? 'Boleta' : 'Factura'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}