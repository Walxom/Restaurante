"use client"

import { Calendar, ChevronDown } from "lucide-react"

interface SalesFiltersProps {
  filter: string
  setFilter: (filter: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  selectedYear: string
  setSelectedYear: (year: string) => void
  availableYears: number[]
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  isFetching?: boolean
}

export function SalesFilters({
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  selectedYear,
  setSelectedYear,
  availableYears,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isFetching = false,
}: SalesFiltersProps) {
  
  const periods = [
    { id: 'all', label: 'Histórico' },
    { id: 'day', label: 'Hoy' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'custom', label: 'Personalizado' }
  ]

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 mb-8 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Selector de Período */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Período de Análisis</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {periods.map((p) => {
              const isActive = filter === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setFilter(p.id)}
                  data-testid={`btn-filter-period-${p.id}`}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                      : 'bg-background/50 text-muted-foreground border-border/50 hover:bg-background/80 hover:border-border'
                  }`}
                >
                  {isActive && isFetching && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-ping" />
                  )}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros de Estado y Año */}
        <div className="flex flex-wrap gap-4">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado de Venta</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="select-filter-status"
                className="appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Ejercicio</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                data-testid="select-filter-year"
                className="appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Rango de Fechas Personalizado */}
      {filter === 'custom' && (
        <div className="pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-filter-start-date"
                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Fecha de Término</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-filter-end-date"
                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
