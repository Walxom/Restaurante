'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, TrendingUp, Clock } from 'lucide-react'
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

  // Definir la función antes del useEffect
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

  // Evitar problemas de hidratación
  if (!mounted) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
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
        return <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">B</Badge>
      case 'FACTURA':
        return <Badge variant="outline" className="border-green-500 text-green-700 text-xs">F</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturación Hoy
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/dashboard/facturacion')}
            >
              Ver Todo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-4">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.todayInvoices}
                </div>
                <div className="text-xs text-gray-500">Comprobantes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.todayRevenue).replace('PEN', 'S/')}
                </div>
                <div className="text-xs text-gray-500">Ingresos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.pendingOrders}
                </div>
                <div className="text-xs text-gray-500">Sin Facturar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.averageTicket).replace('PEN', 'S/')}
                </div>
                <div className="text-xs text-gray-500">Ticket Promedio</div>
              </div>
            </div>

            {/* Comprobantes recientes */}
            {stats.recentInvoices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Últimos Comprobantes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {stats.recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/facturacion/${invoice.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        {getTypeBadge(invoice.type)}
                        <span className="font-mono text-sm">{invoice.number}</span>
                        <span className="text-xs text-gray-500">
                          {invoice.customerName || 'Cliente General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(invoice.total).replace('PEN', 'S/')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(invoice.issuedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => router.push('/dashboard/facturacion')}
              >
                <FileText className="h-4 w-4 mr-1" />
                Crear Factura
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/dashboard/ventas')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Ver Reportes
              </Button>
            </div>

            {/* Alerta de pedidos sin facturar */}
            {stats.pendingOrders > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Tienes <strong>{stats.pendingOrders}</strong> pedidos completados sin facturar
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  onClick={() => router.push('/dashboard/facturacion')}
                >
                  Facturar Ahora
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No hay datos de facturación disponibles</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => router.push('/dashboard/facturacion')}
            >
              Ir a Facturación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Exportación dinámica para evitar problemas de hidratación
export default dynamic(() => Promise.resolve(InvoiceWidget), {
  ssr: false,
  loading: () => {
    const { FileText } = require('lucide-react')
    const { Card, CardHeader, CardTitle, CardContent } = require('@/components/ui/card')
    
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
})