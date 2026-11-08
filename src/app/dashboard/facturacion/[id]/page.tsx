"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import ThermalPrintButton from "@/features/billing/components/ThermalPrintButton"
import { toOrderView, toOrderItemView } from "@/features/orders/utils/type-converters"
import {
  ArrowLeft,
  Receipt,
  FileText,
  User,
  Building2,
  MapPin,
  Calendar,
  CreditCard,
  AlertTriangle,
  Loader2,
  Ban,
  CheckCircle2,
  Lock,
  Mail
} from "lucide-react"
import SendEmailModal from "@/features/billing/components/SendEmailModal"

interface Invoice {
  id: string
  number: string
  type: "BOLETA" | "FACTURA"
  customerName?: string
  customerRuc?: string
  customerAddress?: string
  subtotal: number
  igv: number
  total: number
  paymentMethod: string
  amountPaid: number
  change: number
  status: "ISSUED" | "CANCELLED"
  issuedAt: string
  cancelledAt?: string
  cancelReason?: string
  user: { name: string }
  order?: {
    id: string
    orderNumber: string
    table?: { number: number }
    orderItems?: Array<{
      id: string
      quantity: number
      unitPrice: number
      subtotal: number
      notes?: string
      status: string
      product: {
        name: string
        price: number
      }
    }>
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

export default function FacturaDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showEmailModal, setShowEmailModal] = useState(false)
  
  const [invoiceId, setInvoiceId] = useState<string>("")

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setInvoiceId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (invoiceId && session?.user?.role === "JEFE") {
      fetchInvoice()
    }
  }, [invoiceId, session])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Factura no encontrada")
        }
        throw new Error("Error al cargar el comprobante")
      }

      const data = await response.json()
      setInvoice(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la factura")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setError("El motivo de anulación debe tener al menos 5 caracteres")
      return
    }

    setCancelling(true)
    setError(null)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "cancel",
          cancelReason: cancelReason.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al anular la factura")
      }

      const updatedInvoice = await response.json()
      setInvoice(updatedInvoice)
      setShowCancelModal(false)
      setCancelReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al anular la factura")
    } finally {
      setCancelling(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN"
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Emitida</span>
          </div>
        )
      case "CANCELLED":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <Ban className="w-3.5 h-3.5" />
            <span>Anulada</span>
          </div>
        )
      default:
        return <Badge variant="secondary" className="rounded-full">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "FACTURA" ? (
      <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20 shadow-inner">
        <FileText className="w-6 h-6" />
      </div>
    ) : (
      <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-500/20 shadow-inner">
        <Receipt className="w-6 h-6" />
      </div>
    )
  }

  if (session?.user?.role !== "JEFE") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3">Acceso Denegado</h3>
          <p className="text-muted-foreground leading-relaxed">
            No tienes los permisos necesarios para acceder a esta sección del sistema.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
          </div>
          <p className="text-muted-foreground font-medium tracking-wide uppercase text-sm">Recuperando comprobante...</p>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3">Ocurrió un Error</h3>
          <p className="text-red-500/80 mb-8 font-medium">{error}</p>
          <Button 
            onClick={() => router.push("/dashboard/facturacion")} 
            className="w-full rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Facturación
          </Button>
        </div>
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden pb-20">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Modern Header */}
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/50 shadow-sm supports-[backdrop-filter]:bg-background/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[5rem] py-4 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center w-full sm:w-auto gap-3">
            <Button 
              onClick={() => router.push("/dashboard/facturacion")} 
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-foreground/5 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="h-8 w-px bg-border hidden sm:block mx-2 shrink-0"></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                  {invoice.type}
                </h1>
                <Badge variant="outline" className="bg-background/50 backdrop-blur-md rounded-full font-mono border-border shrink-0">
                  {invoice.number}
                </Badge>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1 hidden sm:block truncate">
                Detalles del Comprobante
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-start sm:justify-end w-full sm:w-auto gap-3 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
            {invoice.order && (() => {
              const orderView = toOrderView({
                id: invoice.order.id,
                orderNumber: invoice.order.orderNumber,
                status: 'COMPLETED',
                totalAmount: Number(invoice.total),
                createdAt: invoice.issuedAt,
                notes: `${invoice.type} - ${invoice.number}`,
                customerName: invoice.customerName || null,
                customerDni: invoice.customerRuc || null,
                table: invoice.order.table ? { 
                  id: '', 
                  number: invoice.order.table.number,
                  status: 'OCUPADA',
                  capacity: 0
                } : null,
                orderItems: invoice.order.orderItems ? invoice.order.orderItems.map((item) => toOrderItemView({
                  id: item.id,
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                  subtotal: Number(item.subtotal),
                  notes: item.notes || null,
                  status: item.status as any,
                  product: {
                    id: '',
                    name: item.product.name,
                    price: Number(item.product.price),
                    categoryId: '',
                    isAvailable: true,
                    isActive: true,
                    category: { id: '', name: '' }
                  },
                  createdAt: invoice.issuedAt
                })) : invoice.items.map((item, index) => toOrderItemView({
                  id: `item-${index}`,
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                  subtotal: Number(item.total),
                  notes: null,
                  status: 'SERVED',
                  product: {
                    id: '',
                    name: item.description,
                    price: Number(item.unitPrice),
                    categoryId: '',
                    isAvailable: true,
                    isActive: true,
                    category: { id: '', name: '' }
                  },
                  createdAt: invoice.issuedAt
                })),
                user: {
                  id: '',
                  name: invoice.user.name
                },
                invoice: {
                  id: invoice.id,
                  type: invoice.type as any,
                  number: invoice.number
                }
              })

              return (
                <ThermalPrintButton 
                  order={orderView}
                  size="default"
                  variant="outline"
                  currentUser={session?.user ? {
                    id: session.user.id || '',
                    name: session.user.name || '',
                    role: session.user.role || ''
                  } : undefined}
                />
              )
            })()}
            {invoice.status === "ISSUED" && (
              <>
                <Button 
                  onClick={() => setShowEmailModal(true)}
                  variant="outline"
                  className="rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white"
                >
                  <Mail className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Enviar Correo</span>
                </Button>
                <Button 
                  onClick={() => setShowCancelModal(true)}
                  variant="destructive"
                  className="rounded-full font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Ban className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Anular</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Columna Izquierda: Detalles */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Principal del Comprobante */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none hover:border-primary/20 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-6">
                <div className="flex items-start gap-4">
                  {getTypeIcon(invoice.type)}
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight mb-2">
                      {invoice.number}
                    </h2>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(invoice.status)}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-foreground/5 px-2.5 py-1 rounded-full">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(invoice.issuedAt)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="sm:text-right p-4 sm:p-0 bg-foreground/5 sm:bg-transparent rounded-2xl w-full sm:w-auto mt-4 sm:mt-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Pagado</p>
                  <div className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500 tracking-tighter break-words">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="flex items-center sm:justify-end gap-1.5 mt-2 text-sm font-medium text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    {invoice.paymentMethod}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Datos del Cliente</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    {invoice.type === "FACTURA" ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {invoice.type === "FACTURA" ? "Razón Social" : "Nombre"}
                  </label>
                  <p className="font-semibold text-foreground text-lg">
                    {invoice.customerName || "Cliente General"}
                  </p>
                </div>
                
                {invoice.customerRuc && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Documento / RUC
                    </label>
                    <p className="font-mono font-semibold text-foreground text-lg bg-foreground/5 px-3 py-1 rounded-lg inline-block">
                      {invoice.customerRuc}
                    </p>
                  </div>
                )}
                
                {invoice.customerAddress && (
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      Dirección
                    </label>
                    <p className="font-medium text-foreground bg-foreground/5 px-4 py-3 rounded-xl break-words">
                      {invoice.customerAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Detalle de Items */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none hover:border-primary/20 transition-colors overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Detalle de Consumo</h3>
              </div>
              
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-foreground/5">
                        <th className="rounded-l-xl text-left py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descripción</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cant.</th>
                        <th className="text-right py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">P. Unit.</th>
                        <th className="rounded-r-xl text-right py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-foreground/5 transition-colors group">
                          <td className="py-4 px-4 font-semibold text-foreground">{item.description}</td>
                          <td className="text-center py-4 px-4 font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.quantity}</td>
                          <td className="text-right py-4 px-4 font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="text-right py-4 px-4 font-mono font-bold text-foreground">
                            {formatCurrency(Number(item.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Sidebar */}
          <div className="space-y-6">
            
            {/* Resumen Financiero */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none hover:border-primary/20 transition-colors">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Resumen de Pago
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono text-foreground">{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground">IGV (18%)</span>
                  <span className="font-mono text-foreground">{formatCurrency(Number(invoice.igv))}</span>
                </div>
                
                <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-4"></div>
                
                <div className="flex justify-between items-center text-lg font-black">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono text-emerald-500 tracking-tight">{formatCurrency(Number(invoice.total))}</span>
                </div>
                
                <div className="bg-foreground/5 rounded-2xl p-4 mt-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Efectivo Pagado</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(Number(invoice.amountPaid))}</span>
                  </div>
                  {invoice.change > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-primary font-bold">Vuelto Entregado</span>
                      <span className="font-mono font-black text-primary">{formatCurrency(Number(invoice.change))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pedido Vinculado */}
            {invoice.order && (
              <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none hover:border-primary/20 transition-colors">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-500" />
                  Origen del Comprobante
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-500/80 uppercase tracking-widest block mb-1">
                      Comanda Vinculada
                    </label>
                    <p className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-lg">
                      {invoice.order.orderNumber}
                    </p>
                  </div>
                  
                  {invoice.order.table && (
                    <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl">
                      <span className="text-sm font-medium text-muted-foreground">Ubicación</span>
                      <Badge variant="outline" className="bg-background rounded-full font-bold border-border">
                        Mesa {invoice.order.table.number}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl">
                    <span className="text-sm font-medium text-muted-foreground">Cajero</span>
                    <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {invoice.user.name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Estado Cancelado / Alerta */}
            {invoice.status === "CANCELLED" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-red-500/10 group-hover:scale-110 transition-transform duration-500">
                  <Ban className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Comprobante Anulado
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-red-500/70 uppercase tracking-widest block mb-1">
                        Fecha y Hora de Anulación
                      </label>
                      <p className="font-semibold text-red-900 dark:text-red-200">
                        {invoice.cancelledAt && formatDate(invoice.cancelledAt)}
                      </p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/10">
                      <label className="text-[10px] font-black text-red-500/70 uppercase tracking-widest block mb-1">
                        Motivo Registrado
                      </label>
                      <p className="text-red-700 dark:text-red-300 font-medium text-sm italic break-words">
                        "{invoice.cancelReason}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal para anular */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card/90 backdrop-blur-2xl border border-border/50 rounded-[2rem] p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95">
            <h3 className="text-xl font-black text-foreground mb-4">Anular Comprobante</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              ¿Estás seguro de que deseas anular el comprobante <strong>{invoice.number}</strong>? 
              Esta acción no se puede deshacer. Por favor, indica el motivo de la anulación.
            </p>
            
            <div className="space-y-4 mb-8">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Motivo de anulación
              </label>
              <Input 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Error en RUC, pedido cancelado..."
                className="bg-foreground/5 border-border/50 rounded-xl"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason("")
                }}
                disabled={cancelling}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelInvoice}
                disabled={cancelling || cancelReason.trim().length < 5}
                className="flex-1 rounded-xl shadow-lg shadow-red-500/20"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Anulando...
                  </>
                ) : (
                  "Confirmar Anulación"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SendEmailModal 
        isOpen={showEmailModal} 
        onClose={() => setShowEmailModal(false)} 
        invoiceId={invoice.id} 
        invoiceNumber={invoice.number} 
      />
    </div>
  )
}
