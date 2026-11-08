"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BarChart3, ChevronLeft, ChevronRight, Hash, RefreshCw } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { useSales, type Sale } from "@/features/dashboard/hooks/useSales"
import { SalesStatsGrid } from "@/features/dashboard/components/sales-stats-grid"
import { SalesAnalyticsPanel } from "@/features/dashboard/components/sales-analytics-panel"
import { SalesFilters } from "@/features/dashboard/components/sales-filters"
import { SalesTable } from "@/features/dashboard/components/sales-table"
import { SaleDetailsModal } from "@/features/dashboard/components/sale-details-modal"

export default function HistorialVentasClient() {
  const {
    sales,
    stats,
    isInitialLoading,
    isFetching,
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

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30">
      <AdminPageHeader
        title="Dashboard de Ventas"
        subtitle="Análisis de Transacciones y KPIs"
        backTo="/dashboard"
      >
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
            {isFetching && <RefreshCw className="w-2.5 h-2.5 text-primary animate-spin" />}
            {isFetching ? "Actualizando Datos..." : "Sincronización Activa"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
            Real-time data flow
          </span>
        </div>
        <div className="hidden sm:flex h-10 w-10 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
      </AdminPageHeader>

      {/* Barra de progreso superior no bloqueante durante actualizaciones en segundo plano */}
      {isFetching && (
        <div className="h-0.5 w-full bg-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-primary animate-pulse w-full h-full" />
        </div>
      )}

      <main className={`relative max-w-7xl mx-auto px-6 py-10 space-y-10 transition-opacity duration-300 ${isFetching ? 'opacity-85' : 'opacity-100'}`}>
        
        {/* KPI GRID */}
        <SalesStatsGrid stats={stats} loading={isInitialLoading} />

        {/* ANALYTICS & BI MODULE */}
        <SalesAnalyticsPanel stats={stats} loading={isInitialLoading} />

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
                  disabled={page === 1 || isFetching}
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
                  disabled={page === totalPages || isFetching}
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
            isFetching={isFetching}
          />

          {/* TABLA DE RESULTADOS */}
          <SalesTable 
            sales={sales}
            paginationLoading={isFetching}
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
        onClose={() => setSelectedSale(null)}
      />
    </div>
  )
}
