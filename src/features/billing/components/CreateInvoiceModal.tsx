'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileText, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  table?: { number: number }
  type: string
  createdAt: string
}

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess
}: CreateInvoiceModalProps) {
  const [step, setStep] = useState<'search' | 'customer' | 'confirm'>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Datos del cliente
  const [customerData, setCustomerData] = useState({
    ruc: '',
    razonSocial: '',
    direccion: '',
    representanteDni: ''
  })
  const [isVerifyingRuc, setIsVerifyingRuc] = useState(false)
  const [isRucVerified, setIsRucVerified] = useState(false)
  
  // Datos de pago
  const [paymentData, setPaymentData] = useState({
    method: 'EFECTIVO',
    amountPaid: 0
  })

  // Buscar pedidos completados sin factura
  const searchOrders = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/search?q=${encodeURIComponent(searchTerm)}&status=COMPLETED&withoutInvoice=true&showAll=true`)
      if (!response.ok) throw new Error('Error al buscar pedidos')
      
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error searching orders:', error)
      alert('Error al buscar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Verificar RUC
  const handleVerifyRUC = async () => {
    if (!customerData.ruc.trim() || customerData.ruc.length !== 11) {
      alert('Por favor ingrese un RUC válido de 11 dígitos')
      return
    }

    setIsVerifyingRuc(true)
    try {
      const response = await fetch(`/api/external/peru/ruc?numero=${customerData.ruc}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Error al verificar el RUC')
        return
      }

      setCustomerData(prev => ({
        ...prev,
        razonSocial: result.data.razonSocial,
        direccion: result.data.direccion
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

  // Crear factura
  const handleCreateInvoice = async () => {
    if (!selectedOrder || !isRucVerified) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          type: 'FACTURA',
          customerName: customerData.razonSocial,
          customerRuc: customerData.ruc,
          customerAddress: customerData.direccion,
          paymentMethod: paymentData.method,
          amountPaid: paymentData.amountPaid,
          autoPrint: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear factura')
      }

      const result = await response.json()
      alert(`Factura ${result.number} creada exitosamente`)
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error creating invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la factura'
      alert(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('search')
    setSearchTerm('')
    setOrders([])
    setSelectedOrder(null)
    setCustomerData({ ruc: '', razonSocial: '', direccion: '', representanteDni: '' })
    setIsRucVerified(false)
    setPaymentData({ method: 'EFECTIVO', amountPaid: 0 })
    onClose()
  }

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    setPaymentData(prev => ({ ...prev, amountPaid: Number(order.totalAmount) }))
    setStep('customer')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderTypeBadge = (type: string) => {
    switch (type) {
      case 'MESA':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Mesa</Badge>
      case 'DELIVERY':
        return <Badge variant="outline" className="border-green-500 text-green-700">Delivery</Badge>
      case 'PARA_LLEVAR':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Para llevar</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Factura
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Buscar pedido completado</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Número de pedido, mesa, etc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrders()}
                  className="flex-1"
                />
                <Button onClick={searchOrders} disabled={loading || !searchTerm.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {orders.length > 0 && (
              <div className="space-y-3">
                <Label>Seleccionar pedido</Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {orders.map((order) => (
                    <Card 
                      key={order.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleOrderSelect(order)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium">#{order.orderNumber}</div>
                            <div className="text-sm text-gray-600">
                              {order.table ? `Mesa ${order.table.number}` : getOrderTypeBadge(order.type)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              S/ {Number(order.totalAmount).toFixed(2)}
                            </div>
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {searchTerm && orders.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron pedidos completados sin factura</p>
              </div>
            )}
          </div>
        )}

        {step === 'customer' && selectedOrder && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Pedido #{selectedOrder.orderNumber}</div>
                  <div className="text-sm text-gray-600">
                    {selectedOrder.table ? `Mesa ${selectedOrder.table.number}` : getOrderTypeBadge(selectedOrder.type)}
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  S/ {Number(selectedOrder.totalAmount).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Datos de la Empresa</Label>
              
              <div className="space-y-2">
                <Label htmlFor="ruc">RUC *</Label>
                <div className="flex gap-2">
                  <Input
                    id="ruc"
                    placeholder="20123456789"
                    value={customerData.ruc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setCustomerData(prev => ({ ...prev, ruc: value }))
                      setIsRucVerified(false)
                    }}
                    maxLength={11}
                    inputMode="numeric"
                    pattern="[0-9]*"
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="razon-social">Razón Social *</Label>
                <div className="flex gap-2">
                  <Input
                    id="razon-social"
                    placeholder="Razón social de la empresa"
                    value={customerData.razonSocial}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, razonSocial: e.target.value }))}
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

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Dirección de la empresa"
                  value={customerData.direccion}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, direccion: e.target.value }))}
                  disabled={isRucVerified}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="representante-dni">DNI del Representante (opcional)</Label>
                <Input
                  id="representante-dni"
                  placeholder="12345678"
                  value={customerData.representanteDni}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setCustomerData(prev => ({ ...prev, representanteDni: value }))
                  }}
                  maxLength={8}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Datos de Pago</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Método de Pago</Label>
                  <Select value={paymentData.method} onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="YAPE">Yape</SelectItem>
                      <SelectItem value="PLIN">Plin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount-paid">Monto Pagado</Label>
                  <Input
                    id="amount-paid"
                    type="number"
                    step="0.01"
                    min={selectedOrder.totalAmount}
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {paymentData.amountPaid > selectedOrder.totalAmount && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    <strong>Vuelto:</strong> S/ {(paymentData.amountPaid - selectedOrder.totalAmount).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('search')}
                className="flex-1"
                disabled={isProcessing}
              >
                Atrás
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!isRucVerified || !customerData.razonSocial.trim() || paymentData.amountPaid < selectedOrder.totalAmount}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedOrder && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Confirmar Factura</h3>
              <p className="text-gray-600">Revise los datos antes de crear la factura</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Datos del Pedido</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Número:</span>
                      <span className="font-mono">#{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-bold">S/ {Number(selectedOrder.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Datos de la Empresa</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>RUC:</span>
                      <span className="font-mono">{customerData.ruc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Razón Social:</span>
                      <span>{customerData.razonSocial}</span>
                    </div>
                    {customerData.direccion && (
                      <div className="flex justify-between">
                        <span>Dirección:</span>
                        <span>{customerData.direccion}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Datos de Pago</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Método:</span>
                      <span>{paymentData.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monto Pagado:</span>
                      <span className="font-bold">S/ {paymentData.amountPaid.toFixed(2)}</span>
                    </div>
                    {paymentData.amountPaid > selectedOrder.totalAmount && (
                      <div className="flex justify-between text-green-600">
                        <span>Vuelto:</span>
                        <span className="font-bold">S/ {(paymentData.amountPaid - selectedOrder.totalAmount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('customer')}
                className="flex-1"
                disabled={isProcessing}
              >
                Atrás
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando Factura...
                  </div>
                ) : (
                  'Crear Factura'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}