"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { FileText, TrendingUp, Calendar, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface InvoicesFiltersProps {
  filters: {
    search: string
    setSearch: (val: string) => void
    typeFilter: string
    setTypeFilter: (val: string) => void
    paymentFilter: string
    setPaymentFilter: (val: string) => void
    statusFilter: string
    setStatusFilter: (val: string) => void
    withoutReceiptFilter: boolean
    setWithoutReceiptFilter: (val: boolean) => void
  }
  handleSearch: () => void
  clearFilters: () => void
}

export default function InvoicesFilters({ filters, handleSearch, clearFilters }: InvoicesFiltersProps) {
  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    paymentFilter, setPaymentFilter,
    statusFilter, setStatusFilter,
    withoutReceiptFilter, setWithoutReceiptFilter
  } = filters

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-4 sm:p-6 border-b border-border/50 flex items-center justify-between bg-foreground/5">
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          Filtros de Búsqueda
        </h2>
        {/* Aquí podrías añadir un indicador de filtros activos si quisieras */}
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Búsqueda Principal */}
          <div className="lg:col-span-2 relative group">
            <Input
              placeholder="Buscar por número, cliente, RUC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background/50 border-border/50 rounded-xl pl-9 h-11 focus:ring-primary/20 transition-all hover:bg-background/80"
            />
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          </div>
          
          {/* Tipo de Comprobante */}
          <Select
            value={withoutReceiptFilter ? "SIN_BOLETA" : typeFilter || "all"}
            onValueChange={(value) => {
              if (value === "SIN_BOLETA") {
                setWithoutReceiptFilter(true);
                setTypeFilter("");
              } else if (value === "all") {
                setWithoutReceiptFilter(false);
                setTypeFilter("");
              } else {
                setWithoutReceiptFilter(false);
                setTypeFilter(value);
              }
            }}
          >
            <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all">
              <SelectValue placeholder="Tipo de Comprobante" />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl">
              <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">Todos los tipos</SelectItem>
              <SelectItem value="BOLETA" className="font-bold uppercase tracking-widest text-[10px]">Boleta</SelectItem>
              <SelectItem value="FACTURA" className="font-bold uppercase tracking-widest text-[10px]">Factura</SelectItem>
              <SelectItem value="SIN_BOLETA" className="font-bold uppercase tracking-widest text-[10px] text-orange-500">Sin boleta</SelectItem>
            </SelectContent>
          </Select>

          {/* Método de Pago */}
          <Select
            value={paymentFilter || "all"}
            onValueChange={(value) => setPaymentFilter(value === "all" ? "" : value)}
            disabled={withoutReceiptFilter}
          >
            <SelectTrigger className={cn(
              "bg-background/50 border-border/50 rounded-xl h-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all",
              withoutReceiptFilter && "opacity-30 cursor-not-allowed"
            )}>
              <SelectValue placeholder="Método de Pago" />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl">
              <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">Todos los pagos</SelectItem>
              <SelectItem value="EFECTIVO" className="font-bold uppercase tracking-widest text-[10px]">Efectivo</SelectItem>
              <SelectItem value="TARJETA" className="font-bold uppercase tracking-widest text-[10px]">Tarjeta</SelectItem>
              <SelectItem value="YAPE" className="font-bold uppercase tracking-widest text-[10px] text-indigo-500">Yape</SelectItem>
              <SelectItem value="PLIN" className="font-bold uppercase tracking-widest text-[10px] text-teal-500">Plin</SelectItem>
              <SelectItem value="TRANSFERENCIA" className="font-bold uppercase tracking-widest text-[10px]">Transferencia</SelectItem>
            </SelectContent>
          </Select>

          {/* Estado */}
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            disabled={withoutReceiptFilter}
          >
            <SelectTrigger className={cn(
              "bg-background/50 border-border/50 rounded-xl h-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all",
              withoutReceiptFilter && "opacity-30 cursor-not-allowed"
            )}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl">
              <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">Todos los estados</SelectItem>
              <SelectItem value="ISSUED" className="font-bold uppercase tracking-widest text-[10px] text-emerald-500">Emitidas</SelectItem>
              <SelectItem value="CANCELLED" className="font-bold uppercase tracking-widest text-[10px] text-rose-500">Anuladas</SelectItem>
            </SelectContent>
          </Select>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSearch} 
              className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              Buscar
            </Button>
            <Button 
              onClick={clearFilters} 
              variant="outline" 
              className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] border-border/50 bg-background/30 hover:bg-background/50 hover:text-rose-500 transition-all"
            >
              Limpiar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
