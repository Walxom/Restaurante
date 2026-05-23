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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative transition-colors duration-500">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30">
      {/* Fondo con gradientes dinámicos */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />

      {/* HEADER PREMIUM */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Button 
              onClick={() => router.push("/dashboard")} 
              variant="ghost"
              data-testid="btn-back-dashboard"
              className="group h-12 w-12 shrink-0 rounded-2xl bg-card/40 border border-border/50 hover:bg-foreground/5 transition-all p-0"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
            <div className="hidden sm:block h-10 w-px bg-border/50 shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-widest truncate">
                <span className="inline sm:hidden">Ventas</span>
                <span className="hidden sm:inline">Dashboard de Ventas</span>
              </h1>
              <p className="hidden md:block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                Análisis de Transacciones y KPIs
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Sincronización Activa</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Real-time data flow</span>
            </div>
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
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
              <div className="flex items-center gap-4 bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-2xl shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || paginationLoading}
                  data-testid="btn-page-prev"
                  className="h-9 w-9 rounded-xl p-0 hover:bg-foreground/5"
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
                  disabled={page === totalPages || paginationLoading}
                  data-testid="btn-page-next"
                  className="h-9 w-9 rounded-xl p-0 hover:bg-foreground/5"
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
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
