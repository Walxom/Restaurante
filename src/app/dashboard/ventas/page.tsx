"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ThermalPrintButton from "@/components/ThermalPrintButton"
import { DollarSign, ShoppingCart, TrendingUp, ArrowLeft, Download, Search, Calendar, Users, Clock, ChevronDown, ChevronUp, BarChart3, PieChart, Target, AlertCircle, Info, Utensils, CreditCard, MapPin, X } from "lucide-react"

interface Sale {
  id: string
  orderNumber: string
  totalAmount: number | string
  createdAt: string
  status: string
  table?: { number: number }
  user: { name: string; username: string }
  orderItems: Array<{
    quantity: number
    product: { name: string; price: number | string }
  }>
}

interface SalesStats {
  totalSales: number
  totalOrders: number
  averageTicket: number
  completedOrders: number
  cancelledOrders: number
  topProducts?: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  salesByHour?: Array<{
    hour: number
    sales: number
    orders: number
  }>
  topWaiters?: Array<{
    name: string
    orders: number
    revenue: number
  }>
}

export default function HistorialVentasPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [filter, setFilter] = useState("day")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showModal, setShowModal] = useState(false)


  const limit = 10

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/sales/years')
      if (response.ok) {
        const data = await response.json()
        setAvailableYears(data.years)
      }
    } catch (error) {
      console.error('Error al cargar años disponibles:', error)
    }
  }

  useEffect(() => {
    fetchAvailableYears()
  }, [])

  // Funciones de paginación optimizadas
  const handlePreviousPage = () => {
    setPage(page - 1)
  }

  const handleNextPage = () => {
    setPage(page + 1)
  }

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1)
  }, [filter, statusFilter, startDate, endDate, selectedYear])

  useEffect(() => {
    if (session?.user?.role && ["ADMIN", "JEFE"].includes(session.user.role)) {
      fetchSalesData()
    } else if (session?.user?.role) {
      router.push("/dashboard")
    }
  }, [session, router, filter, statusFilter, page, startDate, endDate, selectedYear])

  const fetchSalesData = async () => {
    try {
      // Solo mostrar loading general en la primera carga
      if (sales.length === 0) {
        setLoading(true)
      } else {
        setPaginationLoading(true)
      }
      const url = new URL(`${window.location.origin}/api/sales`)
      url.searchParams.set("filter", filter)
      url.searchParams.set("status", statusFilter)
      url.searchParams.set("page", page.toString())
      url.searchParams.set("limit", limit.toString())
      url.searchParams.set("includeExtended", "true")

      if (filter === "custom" && startDate && endDate) {
        url.searchParams.set("startDate", startDate)
        url.searchParams.set("endDate", endDate)
      }
      if (selectedYear) {
        url.searchParams.set("year", selectedYear)
      }


      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setSales(data.sales)
        setStats(data.stats)
        setTotalPages(data.totalPages)
      } else {
        console.error("Error al cargar datos de ventas")
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
      setPaginationLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    return `S/ ${numAmount.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial de ventas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => router.push("/dashboard")} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Dashboard de Ventas</h1>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Card principal con diseño minimalista */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Historial de Ventas</h2>
            <p className="text-sm text-gray-600">Gestiona y analiza las ventas de tu restaurante</p>
          </div>
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    <p className="text-xs sm:text-sm text-gray-600">Ventas Totales</p>
                  </div>
                  <p className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 break-words">{formatCurrency(stats.totalSales)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                 <div className="text-center">
                   <div className="flex items-center justify-center mb-2">
                     <ShoppingCart className="w-4 h-4 text-blue-600 mr-1" />
                     <p className="text-xs sm:text-sm text-gray-600">Total Pedidos</p>
                   </div>
                   <p className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">{stats.totalOrders}</p>
                 </div>
               </div>

               <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                 <div className="text-center">
                   <div className="flex items-center justify-center mb-2">
                     <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                     <p className="text-xs sm:text-sm text-gray-600">Completadas</p>
                   </div>
                   <p className="text-base sm:text-lg lg:text-xl font-semibold text-green-600">{stats.completedOrders}</p>
                 </div>
               </div>

               <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                 <div className="text-center">
                   <div className="flex items-center justify-center mb-2">
                     <X className="w-4 h-4 text-red-600 mr-1" />
                     <p className="text-xs sm:text-sm text-gray-600">Canceladas</p>
                   </div>
                   <p className="text-base sm:text-lg lg:text-xl font-semibold text-red-600">{stats.cancelledOrders}</p>
                 </div>
               </div>
            </div>
            {/* Filtros */}
            <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="space-y-4">
                {/* Filtros de período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">Período:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    <Button
                      variant={filter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('all')}
                      className="w-full text-xs sm:text-sm"
                    >
                      Todo
                    </Button>
                    <Button
                      variant={filter === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('day')}
                      className="w-full text-xs sm:text-sm"
                    >
                      Hoy
                    </Button>
                    <Button
                      variant={filter === 'week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('week')}
                      className="w-full text-xs sm:text-sm"
                    >
                      Semana
                    </Button>
                    <Button
                      variant={filter === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('month')}
                      className="w-full text-xs sm:text-sm"
                    >
                      Mes
                    </Button>
                    <Button
                      variant={filter === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('custom')}
                      className="w-full text-xs sm:text-sm col-span-2 sm:col-span-1"
                    >
                      Personalizado
                    </Button>
                  </div>
                </div>

                {/* Filtro de fechas personalizado */}
                {filter === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Rango de fechas:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Desde:</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Hasta:</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtros adicionales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 block">Estado:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="all">Todas</option>
                      <option value="completed">Completadas</option>
                      <option value="cancelled">Canceladas</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 block">Año:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))
                      ) : (
                        <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  Mostrando {((page - 1) * 10) + 1}-{Math.min(page * 10, stats.totalOrders)} de {stats.totalOrders} ventas
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                    className="px-3 py-2 text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Anterior</span>
                    <span className="sm:hidden">‹</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm text-gray-600 px-2">
                      <span className="hidden sm:inline">Página </span>{page} de {totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="sm:hidden">›</span>
                  </Button>
                </div>
              </div>
            )}
            {sales.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No se encontraron ventas</p>
                <p className="text-gray-400 text-sm">Ajusta los filtros para ver más resultados</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Vista de tabla para desktop */}
                <div className="hidden md:block">
                  <div className={`overflow-x-auto transition-opacity duration-300 ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Pedido</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Mesa/Tipo</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Mesero</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Items</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="transition-all duration-300 ease-in-out">
                        {sales.map((sale, index) => (
                          <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-medium">#{sale.orderNumber}</span>
                            </td>
                            <td className="py-3 px-4">
                              {sale.status === "COMPLETED" ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                  Completada
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                  Cancelada
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {sale.table ? `Mesa ${sale.table.number}` : 'Para llevar'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {sale.user?.name || 'No asignado'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {sale.orderItems.length}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(sale.createdAt).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className={sale.status === 'CANCELLED' ? 'line-through text-gray-500' : ''}>
                                <span className="font-semibold">
                                  {formatCurrency(sale.totalAmount)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => {
                                   setSelectedSale(sale)
                                   setShowModal(true)
                                 }}
                                 className="text-blue-600 hover:text-blue-800 text-sm"
                               >
                                 Ver detalles
                               </Button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista de tarjetas para móvil */}
                <div className="md:hidden">
                  <div className={`divide-y divide-gray-200 transition-opacity duration-300 ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}>
                    {sales.map((sale) => (
                      <div key={sale.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium text-gray-900">
                              #{sale.orderNumber}
                            </div>
                            {sale.status === "COMPLETED" ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                Completada
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                Cancelada
                              </Badge>
                            )}
                          </div>
                          <div className={`text-sm font-medium ${sale.status === 'CANCELLED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {formatCurrency(sale.totalAmount)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500">Mesa/Tipo:</span>
                            <div className="text-gray-900">
                              {sale.table ? `Mesa ${sale.table.number}` : 'Para llevar'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Mesero:</span>
                            <div className="text-gray-900">{sale.user?.name || 'No asignado'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Items:</span>
                            <div className="text-gray-900">{sale.orderItems.length} items</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Fecha:</span>
                            <div className="text-gray-900">
                              {new Date(sale.createdAt).toLocaleDateString('es-PE')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(sale.createdAt).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSale(sale)
                              setShowModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm w-full sm:w-auto"
                          >
                            Ver detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>


      </main>

      {/* Modal de detalles del pedido */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Detalles del Pedido #{selectedSale.orderNumber}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModal(false)
                  setSelectedSale(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Información General</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Estado:</span>
                      <Badge 
                        variant={selectedSale.status === 'COMPLETED' ? 'default' : 'destructive'}
                        className={`text-xs ${selectedSale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {selectedSale.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                      </Badge>
                    </div>
                    <p><span className="font-medium">Mesa/Tipo:</span> {selectedSale.table ? `Mesa ${selectedSale.table.number}` : 'Para llevar'}</p>
                    <p><span className="font-medium">Mesero:</span> {selectedSale.user?.name || 'No asignado'}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(selectedSale.createdAt).toLocaleString('es-PE')}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Resumen</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Total de items:</span> {selectedSale.orderItems.length}</p>
                    <p><span className="font-medium">Total:</span> 
                      <span className={selectedSale.status === 'CANCELLED' ? 'line-through text-gray-500 ml-1' : 'ml-1 font-semibold'}>
                        {formatCurrency(selectedSale.totalAmount)}
                      </span>
                    </p>
                    {selectedSale.status === 'CANCELLED' && (
                      <p className="text-red-600 text-xs">Venta cancelada</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Items del pedido */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Items del Pedido</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Producto</th>
                        <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Cantidad</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Precio Unit.</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.orderItems.map((item, index) => {
                        const unitPrice = typeof item.product.price === "string" ? parseFloat(item.product.price) : item.product.price
                        const subtotal = unitPrice * item.quantity
                        return (
                          <tr key={index} className="border-t border-gray-100">
                            <td className="py-2 px-3 text-sm">{item.product.name}</td>
                            <td className="py-2 px-3 text-sm text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-sm text-right">{formatCurrency(unitPrice)}</td>
                            <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(subtotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-between items-center pt-4">
                {/* Botón de impresión - Solo para pedidos completados */}
                {selectedSale.status === 'COMPLETED' && (
                  <ThermalPrintButton 
                    order={{
                      ...selectedSale,
                      totalAmount: Number(selectedSale.totalAmount) || 0,
                      orderItems: selectedSale.orderItems.map((item, index) => ({
                        id: `item-${index}`,
                        quantity: item.quantity,
                        unitPrice: Number(item.product.price) || 0,
                        subtotal: item.quantity * (Number(item.product.price) || 0),
                        status: 'COMPLETED',
                        product: {
                          name: item.product.name
                        }
                      }))
                    }}
                    currentUser={{
                      id: session?.user?.id || '',
                      name: session?.user?.name || '',
                      role: session?.user?.role || ''
                    }}
                  />
                )}
                
                {/* Espaciador si no hay botón de impresión */}
                {selectedSale.status !== 'COMPLETED' && <div></div>}
                
                <Button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedSale(null)
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
