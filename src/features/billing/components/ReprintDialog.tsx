'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, AlertTriangle, CheckCircle, Loader2, WifiOff, Receipt, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

type Phase = 'checking' | 'unavailable' | 'confirm' | 'printing' | 'success'

interface ServiceStatus {
  isAvailable: boolean
  message: string
}

interface DocumentInfo {
  type: 'BOLETA' | 'FACTURA'
  number: string
  orderNumber: string
  customerName: string
  total: string
}

interface ReprintDialogProps {
  orderId: string
  documentType?: 'BOLETA' | 'FACTURA'
  customerName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReprintDialog({
  orderId,
  documentType = 'BOLETA',
  customerName,
  open,
  onOpenChange,
  onSuccess,
}: ReprintDialogProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null)
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null)

  // Cada vez que se abre el diálogo, reiniciar y verificar el servicio
  useEffect(() => {
    if (!open) return
    setPhase('checking')
    setServiceStatus(null)
    setDocInfo(null)
    void checkService()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function checkService() {
    try {
      // Consultar la vista previa — nos da el estado del servicio y datos del comprobante
      const res = await fetch('/api/thermal-print/receipt-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documentType,
          customerName,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setServiceStatus({ isAvailable: false, message: data.error || 'Error al verificar el servicio' })
        setPhase('unavailable')
        return
      }

      setDocInfo({
        type: data.documentData.type,
        number: data.documentData.number,
        orderNumber: data.documentData.orderNumber,
        customerName: data.documentData.customerName,
        total: data.documentData.total,
      })

      setServiceStatus({
        isAvailable: data.serviceStatus.isAvailable,
        message: data.serviceStatus.message,
      })

      setPhase(data.serviceStatus.isAvailable ? 'confirm' : 'unavailable')
    } catch (err) {
      setServiceStatus({
        isAvailable: false,
        message: err instanceof Error ? err.message : 'No se pudo contactar el servidor',
      })
      setPhase('unavailable')
    }
  }

  async function handlePrint() {
    setPhase('printing')
    try {
      const res = await fetch('/api/thermal-print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documentType,
          customerName,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al imprimir')
      }

      setPhase('success')
      toast.success(`${documentType} impresa exitosamente`)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
      }, 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
      // Volver a la confirmación para que pueda reintentar
      setPhase('confirm')
    }
  }

  function handleClose() {
    if (phase === 'printing') return // no cerrar mientras imprime
    onOpenChange(false)
  }

  const Icon = documentType === 'FACTURA' ? FileText : Receipt

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-card">
        {/* Títulos ocultos requeridos por accesibilidad (Radix UI) */}
        <span className="sr-only">
          <DialogTitle>Reimprimir {documentType}</DialogTitle>
          <DialogDescription>Diálogo de reimpresión de comprobante fiscal</DialogDescription>
        </span>

        {/* ── Fase: verificando ── */}
        {phase === 'checking' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                Verificando servicio
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                Comprobando impresora...
              </p>
            </div>
          </div>
        )}

        {/* ── Fase: servicio no disponible ── */}
        {phase === 'unavailable' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10">
              <WifiOff className="h-7 w-7 text-rose-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                Servicio no disponible
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70 leading-relaxed px-2">
                {serviceStatus?.message || 'La impresora no está configurada o no responde.'}
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest border-border"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => { setPhase('checking'); void checkService() }}
                className="flex-1 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-foreground text-background hover:opacity-90"
              >
                <Loader2 className="h-3.5 w-3.5 mr-1.5" />
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* ── Fase: confirmación ── */}
        {phase === 'confirm' && docInfo && (
          <div className="flex flex-col gap-0">
            {/* Header */}
            <div className="px-7 pt-7 pb-5 flex items-center gap-4 border-b border-border/50">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground leading-none">
                  Reimprimir {documentType}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">
                  {docInfo.number}
                </p>
              </div>
            </div>

            {/* Info comprobante */}
            <div className="px-7 py-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Pedido</span>
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">#{docInfo.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Cliente</span>
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest truncate max-w-[140px]">{docInfo.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Total</span>
                <span className="text-base font-black text-emerald-500 tracking-tight">S/ {docInfo.total}</span>
              </div>

              {/* Badge de impresora disponible */}
              <div className="flex items-center gap-2 mt-1 p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/15">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 truncate">
                  Impresora disponible
                </p>
              </div>
            </div>

            {/* Pregunta + acciones */}
            <div className="px-7 pb-7 pt-1 space-y-3 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center pt-3 opacity-70">
                ¿Enviar a imprimir?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePrint}
                  className="flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  Sí, Imprimir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Fase: imprimiendo ── */}
        {phase === 'printing' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
              <Printer className="h-7 w-7 text-primary animate-bounce" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                Enviando a impresora
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                No cierre esta ventana...
              </p>
            </div>
          </div>
        )}

        {/* ── Fase: éxito ── */}
        {phase === 'success' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                Impreso exitosamente
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                Cerrando...
              </p>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
