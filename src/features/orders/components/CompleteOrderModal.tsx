"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Receipt, FileText, X, Search, Check, ShieldCheck, Sparkles, Coins, CreditCard, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

// Clases Tailwind COMPLETAS por color. Tailwind v4 escanea strings literales;
// las clases interpoladas (`bg-${color}-500/10`) NO se generan, por eso el
// estado seleccionado quedaba sin estilos. Mapear a literales lo soluciona.
const COLOR_CLASSES: Record<string, { active: string; icon: string }> = {
  emerald: { active: 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5', icon: 'text-emerald-500' },
  blue: { active: 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/5', icon: 'text-blue-500' },
  purple: { active: 'bg-purple-500/10 border-purple-500/50 shadow-lg shadow-purple-500/5', icon: 'text-purple-500' },
  sky: { active: 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/5', icon: 'text-sky-500' },
  slate: { active: 'bg-slate-500/10 border-slate-500/50 shadow-lg shadow-slate-500/5', icon: 'text-slate-500' },
}

export default function CompleteOrderModal({
  isOpen,
  onClose,
  onComplete,
  orderNumber,
  totalAmount
}: CompleteOrderModalProps) {
  const [selectedType, setSelectedType] = useState<'none' | 'boleta' | 'factura' | null>(null)
  const [customerData, setCustomerData] = useState({ name: '', document: '', ruc: '' })
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN'>('EFECTIVO')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDniVerified, setIsDniVerified] = useState(false)
  const [isRucVerified, setIsRucVerified] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState('')

  const handleVerifyDNI = async () => {
    if (customerData.document.length !== 8) return
    setIsVerifying(true)
    try {
      const res = await fetch('/api/customers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'dni', numero: customerData.document })
      })
      const result = await res.json()
      if (res.ok && result.data) {
        setCustomerData(prev => ({ ...prev, name: result.data.nombreCompleto }))
        setIsDniVerified(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleVerifyRUC = async () => {
    if (customerData.ruc.length !== 11) return
    setIsVerifying(true)
    try {
      const res = await fetch('/api/customers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ruc', numero: customerData.ruc })
      })
      const result = await res.json()
      if (res.ok && result.data) {
        setCustomerData(prev => ({ ...prev, name: result.data.razonSocial }))
        setIsRucVerified(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedType) return
    setIsProcessing(true)
    try {
      const receiptNum = await onComplete(selectedType, {
        name: customerData.name,
        document: customerData.document,
        ruc: selectedType === 'factura' ? customerData.ruc : undefined
      }, paymentMethod)
      setReceiptNumber(receiptNum || '')
      setShowSuccess(true)
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setSelectedType(null)
    setCustomerData({ name: '', document: '', ruc: '' })
    setPaymentMethod('EFECTIVO')
    setIsDniVerified(false)
    setIsRucVerified(false)
    setShowSuccess(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card/40 backdrop-blur-2xl border-border/50 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Receipt className="w-5 h-5" />
            </div>
            Finalizar Venta
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="p-8 pt-4 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 relative">
                <Check className="w-10 h-10" />
                <Sparkles className="w-6 h-6 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">Venta Exitosa</h3>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Operación confirmada</p>
              </div>
            </div>

            <div className="bg-foreground/5 rounded-3xl p-6 border border-border/50 space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-4">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Orden</span>
                <span className="font-bold text-foreground">#{orderNumber}</span>
              </div>
              {receiptNumber && (
                <div className="flex justify-between items-center border-b border-border/50 pb-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Comprobante</span>
                  <span className="font-mono font-bold text-emerald-500">{receiptNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pagado</span>
                <span className="text-xl font-black text-foreground">S/ {(typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={handleClose}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
            >
              Cerrar y Continuar
            </Button>
          </div>
        ) : (
          <div className="p-8 pt-4 space-y-8">
            {/* Total Display */}
            <div className="bg-foreground/5 rounded-3xl p-6 border border-border/50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total a Cobrar</p>
                <h4 className="text-3xl font-black text-foreground tracking-tighter">S/ {(typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount).toFixed(2)}</h4>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-xl transition-all duration-300",
                paymentMethod === 'EFECTIVO' ? 'bg-emerald-500/10 text-emerald-500' :
                paymentMethod === 'TARJETA' ? 'bg-blue-500/10 text-blue-500' :
                paymentMethod === 'YAPE' ? 'bg-purple-500/10 text-purple-500' :
                'bg-sky-500/10 text-sky-500'
              )}>
                <span className="text-xs font-black uppercase tracking-widest">
                  {paymentMethod === 'EFECTIVO' ? 'Efectivo' :
                   paymentMethod === 'TARJETA' ? 'Tarjeta' :
                   paymentMethod === 'YAPE' ? 'Yape' : 'Plin'}
                </span>
              </div>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Método de Pago</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'EFECTIVO', label: 'Efectivo', icon: Coins, color: 'emerald' },
                  { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
                  { id: 'YAPE', label: 'Yape', icon: Smartphone, color: 'purple' },
                  { id: 'PLIN', label: 'Plin', icon: Smartphone, color: 'sky' }
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 gap-2 text-center cursor-pointer",
                      paymentMethod === method.id
                        ? COLOR_CLASSES[method.color].active
                        : "bg-foreground/5 border-border/50 hover:border-foreground/20"
                    )}
                  >
                    <method.icon className={cn(
                      "w-5 h-5 transition-colors",
                      paymentMethod === method.id ? COLOR_CLASSES[method.color].icon : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tight",
                      paymentMethod === method.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Grid */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Tipo de Comprobante</Label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'none', label: 'Sin Comprobante', icon: X, color: 'slate' },
                  { id: 'boleta', label: 'Boleta de Venta', icon: Receipt, color: 'emerald' },
                  { id: 'factura', label: 'Factura Electrónica', icon: FileText, color: 'blue' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id as any)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left",
                      selectedType === type.id
                        ? COLOR_CLASSES[type.color].active
                        : "bg-foreground/5 border-border/50 hover:border-foreground/20"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      selectedType === type.id ? COLOR_CLASSES[type.color].icon : "text-muted-foreground"
                    )}>
                      <type.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-black uppercase tracking-tight", selectedType === type.id ? "text-foreground" : "text-muted-foreground")}>
                        {type.label}
                      </p>
                    </div>
                    {selectedType === type.id && <Check className="w-4 h-4 text-foreground" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Form */}
            {selectedType && selectedType !== 'none' && (
              <div className="space-y-5 animate-in slide-in-from-top duration-300">
                <div className="h-px bg-border/50" />
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">
                      {selectedType === 'boleta' ? 'DNI del Cliente' : 'RUC de la Empresa'}
                    </Label>
                    <div className="relative group">
                      <Input
                        value={selectedType === 'boleta' ? customerData.document : customerData.ruc}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '')
                          if (selectedType === 'boleta') {
                            val = val.slice(0, 8)
                          } else if (selectedType === 'factura') {
                            val = val.slice(0, 11)
                          }
                          
                          setCustomerData(prev => ({ 
                            ...prev, 
                            [selectedType === 'boleta' ? 'document' : 'ruc']: val 
                          }))
                          setIsDniVerified(false)
                          setIsRucVerified(false)
                        }}
                        maxLength={selectedType === 'boleta' ? 8 : 11}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={selectedType === 'boleta' ? "8 dígitos" : "11 dígitos"}
                        className="h-14 rounded-2xl bg-foreground/5 border-border/50 pl-12 focus:ring-blue-500/20 font-bold"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                      <Button
                        onClick={selectedType === 'boleta' ? handleVerifyDNI : handleVerifyRUC}
                        disabled={isVerifying || (selectedType === 'boleta' ? customerData.document.length !== 8 : customerData.ruc.length !== 11)}
                        className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 font-black uppercase tracking-widest text-[9px]"
                      >
                        {isVerifying ? "..." : "Validar"}
                      </Button>
                    </div>
                  </div>

                  {(isDniVerified || isRucVerified) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in zoom-in duration-300">
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Identidad Verificada</p>
                        <p className="text-sm font-bold text-foreground leading-tight">{customerData.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500/10 hover:text-rose-500"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleComplete}
                disabled={
                  !selectedType || 
                  (selectedType === 'boleta' && !isDniVerified) || 
                  (selectedType === 'factura' && !isRucVerified) || 
                  isProcessing
                }
                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20"
              >
                {isProcessing ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CompleteOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (receiptType: 'none' | 'boleta' | 'factura', customerData?: {
    name: string
    document: string
    ruc?: string
  }, paymentMethod?: string) => Promise<string>
  orderNumber: string
  totalAmount: number
}

