'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
}

export default function SendEmailModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber
}: SendEmailModalProps) {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el correo')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setSuccess(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card/40 backdrop-blur-2xl border-border/50 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Mail className="w-5 h-5" />
            </div>
            Enviar por Correo
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="p-8 pt-4 space-y-6 animate-in fade-in zoom-in duration-300 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-10 h-10" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Correo Enviado</h3>
              <p className="text-sm text-muted-foreground mt-2">
                El comprobante <strong className="text-foreground">{invoiceNumber}</strong> fue enviado exitosamente a:
                <br />
                <span className="font-bold text-blue-500">{email}</span>
              </p>
            </div>
            <Button 
              onClick={handleClose}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
            >
              Entendido
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ingresa el correo electrónico del cliente para enviarle el comprobante <strong className="text-foreground">{invoiceNumber}</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">
                  Correo Electrónico
                </Label>
                <div className="relative group">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    placeholder="cliente@ejemplo.com"
                    className="h-14 rounded-2xl bg-foreground/5 border-border/50 pl-12 focus:ring-blue-500/20 font-bold"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 mt-2 text-rose-500 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500/10 hover:text-rose-500"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!email || isSending}
                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20"
              >
                {isSending ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Correo
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
