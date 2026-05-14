"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Hash } from "lucide-react"
import { useSales, Sale } from "@/features/dashboard/hooks/useSales"
import { SalesStatsGrid } from "./components/sales-stats-grid"
import { SalesFilters } from "./components/sales-filters"
import { SalesTable } from "./components/sales-table"
import { SaleDetailsModal } from "./components/sale-details-modal"

export default function HistorialVentasPage() {
  const router = useRouter()
  const {
    sales,
    stats,
    loading,
    paginationLoading,
    filter,
    setFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedYear,
    setSelectedYear,
    availableYears
  } = useSales()

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showModal, setShowModal] = useState(false)

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20">
            <BarChart3 className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em]">Sincronizando Historial</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Consultando registros en base de datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground selection:bg-primary/30">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* HEADER PREMIUM */}
      <header className="sticky top-0 z-40 bg-[#050505]/60 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              onClick={() => router.push("/dashboard")} 
              variant="ghost"
              className="group h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all p-0"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div>
              <h1 className="text-sm font-black text-foreground uppercase tracking-[0.2em] leading-none mb-1">
                Dashboard de Ventas
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Análisis de Transacciones y KPIs
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Sincronización Activa</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Real-time data flow</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* KPI GRID */}
        <SalesStatsGrid stats={stats} />

        {/* CONTROLES Y TABLA */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Registro de Operaciones</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Listado detallado de tickets y boletas</p>
            </div>
            
            {/* PAGINACIÓN COMPACTA ARRIBA */}
            {totalPages > 1 && (
              <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.05] p-1.5 rounded-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="h-9 w-9 rounded-xl p-0 hover:bg-white/[0.05]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{page}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">/</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{totalPages}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="h-9 w-9 rounded-xl p-0 hover:bg-white/[0.05]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* FILTROS TÉCNICOS */}
          <SalesFilters 
            filter={filter}
            setFilter={setFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            availableYears={availableYears}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />

          {/* TABLA DE RESULTADOS */}
          <SalesTable 
            sales={sales}
            paginationLoading={paginationLoading}
            onViewDetails={handleViewDetails}
          />

          {/* INFO DE PIE DE TABLA */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Total Registros: <span className="text-foreground">{stats.totalOrders}</span>
                </span>
              </div>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
              Datos procesados dinámicamente según filtros aplicados
            </p>
          </div>
        </div>
      </main>

      {/* MODAL DE DETALLES */}
      <SaleDetailsModal 
        sale={selectedSale}
        onClose={() => {
          setShowModal(false)
          setSelectedSale(null)
        }}
      />
    </div>
  )
}
