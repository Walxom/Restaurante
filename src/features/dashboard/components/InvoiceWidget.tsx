'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { FileText, Plus, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface InvoiceStats {
  todayInvoices: number
  todayRevenue: number
  pendingOrders: number
  averageTicket: number
  recentInvoices: Array<{
    id: string
    number: string
    type: 'BOLETA' | 'FACTURA'
    total: number
    customerName?: string
    issuedAt: string
  }>
}

function InvoiceWidget() {
  const router = useRouter()
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const fetchInvoiceStats = async () => {
    try {
      const response = await fetch('/api/dashboard/invoice-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching invoice stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchInvoiceStats()
  }, [])

  if (!mounted || loading) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 sm:p-6 border-b border-border/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-500/10 rounded-xl" />
             <div className="h-5 bg-foreground/10 rounded w-32" />
          </div>
          <div className="h-8 bg-foreground/10 rounded-xl w-20" />
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-foreground/5 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-foreground/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BOLETA':
        return <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-500 tracking-tighter">B</span>
      case 'FACTURA':
        return <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-500 tracking-tighter">F</span>
      default:
        return <span className="px-2 py-0.5 bg-foreground/10 border border-border/50 rounded-lg text-[10px] font-black text-muted-foreground tracking-tighter">{type}</span>
    }
  }

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="p-4 sm:p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-3 uppercase tracking-tighter">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
              <FileText className="h-5 w-5" />
            </div>
            Facturación Hoy
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push('/dashboard/facturacion')}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-foreground/5"
          >
            Ver Todo
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {stats ? (
          <div className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Comprobantes', value: stats.todayInvoices, colorClass: 'text-blue-500' },
                { label: 'Ingresos', value: formatCurrency(stats.todayRevenue), colorClass: 'text-emerald-500' },
                { label: 'Sin Facturar', value: stats.pendingOrders, colorClass: 'text-orange-500' },
                { label: 'Ticket Promedio', value: formatCurrency(stats.averageTicket), colorClass: 'text-purple-500' },
              ].map((stat) => (
                <div key={stat.label} className="p-4 bg-foreground/5 rounded-2xl border border-border/30 text-center flex flex-col items-center justify-center space-y-1">
                  <div className={`text-xl sm:text-2xl font-black tracking-tighter ${stat.colorClass}`}>
                    {stat.value}
                  </div>
                  <div className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.1em] opacity-60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Comprobantes recientes */}
            {stats.recentInvoices.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Clock className="w-3 h-3" />
                  Últimos Movimientos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {stats.recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="group flex items-center justify-between p-3 bg-foreground/5 rounded-xl border border-border/30 hover:border-foreground/20 transition-all cursor-pointer"
                      onClick={() => router.push(`/dashboard/facturacion/${invoice.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {getTypeBadge(invoice.type)}
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-foreground">{invoice.number}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight truncate max-w-[120px]">
                            {invoice.customerName || 'Cliente General'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-foreground">
                          {formatCurrency(invoice.total).replace('PEN', 'S/')}
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground">
                          {formatTime(invoice.issuedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerta de pedidos sin facturar */}
            {stats.pendingOrders > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Atención Pendiente</p>
                    <p className="text-xs font-bold text-foreground leading-tight">
                      Hay <span className="text-orange-500">{stats.pendingOrders}</span> órdenes listas para facturación.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push('/dashboard/facturacion')}
                  className="w-full sm:w-auto h-9 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] px-6 shadow-lg shadow-orange-600/20"
                >
                  Facturar Ahora
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sin datos de facturación</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              onClick={() => router.push('/dashboard/facturacion')}
            >
              Ir a Facturación
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Exportación dinámica para evitar problemas de hidratación
export default dynamic(() => Promise.resolve(InvoiceWidget), {
  ssr: false,
  loading: () => {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 sm:p-6 border-b border-border/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-500/10 rounded-xl" />
             <div className="h-5 bg-foreground/10 rounded w-32" />
          </div>
          <div className="h-8 bg-foreground/10 rounded-xl w-20" />
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-foreground/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }
})