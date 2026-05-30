"use client"

import { Invoice } from "@/features/billing/hooks/useInvoices"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText, Package, Eye } from "lucide-react"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { cn } from "@/lib/utils"

interface InvoicesTableProps {
  invoices: Invoice[]
  withoutReceiptFilter: boolean
  pagination: {
    currentPage: number
    setCurrentPage: (val: number | ((prev: number) => number)) => void
    totalPages: number
  }
  formatCurrency: (amount: number | string) => string
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => React.ReactNode
  getTypeBadge: (type: string) => React.ReactNode
  onViewOrder: (id: string) => Promise<void>
  onEmitOrder: (id: string) => Promise<void>
  router: AppRouterInstance
}

export default function InvoicesTable({
  invoices,
  withoutReceiptFilter,
  pagination,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getTypeBadge,
  onViewOrder,
  onEmitOrder,
  router
}: InvoicesTableProps) {
  const { currentPage, setCurrentPage, totalPages } = pagination

  return (
    <div className="w-full bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-sm sm:text-base font-black text-foreground uppercase tracking-widest flex items-center gap-2 min-w-0 w-full sm:w-auto">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Lista de Comprobantes</span>
        </h2>
        <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] sm:text-xs font-black text-primary tracking-widest shrink-0">
          {invoices.length} {withoutReceiptFilter ? 'Pendientes' : 'Registros'}
        </span>
      </div>
      <div className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-foreground/5">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Número</TableHead>
                <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Tipo</TableHead>
                {!withoutReceiptFilter && <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Cliente</TableHead>}
                <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Total</TableHead>
                {!withoutReceiptFilter && <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Pago</TableHead>}
                {!withoutReceiptFilter && <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Estado</TableHead>}
                <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4">Fecha</TableHead>
                <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground py-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <FileText className="w-12 h-12 mb-3 text-muted-foreground" />
                      <p className="font-black uppercase tracking-widest text-xs">No se encontraron comprobantes</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.map((invoice) => (
                <TableRow key={invoice.id} className="border-border/40 hover:bg-foreground/5 transition-colors group">
                  <TableCell className="font-mono text-sm font-black tracking-tighter py-4">
                    {invoice.number}
                  </TableCell>
                  <TableCell className="py-4">
                    {getTypeBadge(invoice.type)}
                  </TableCell>
                  {!withoutReceiptFilter && (
                    <TableCell className="max-w-[200px] py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {invoice.customerName || "Cliente General"}
                        </span>
                        {invoice.customerRuc && (
                          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tight">
                            DOC: {invoice.customerRuc}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="font-black text-foreground py-4">
                    {formatCurrency(invoice.total).replace('PEN', 'S/')}
                  </TableCell>
                  {!withoutReceiptFilter && (
                    <TableCell className="py-4">
                      <span className="px-2 py-0.5 bg-foreground/5 border border-border/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {invoice.paymentMethod}
                      </span>
                    </TableCell>
                  )}
                  {!withoutReceiptFilter && (
                    <TableCell className="py-4">
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                  )}
                  <TableCell className="text-xs font-bold text-muted-foreground py-4">
                    {formatDate(invoice.issuedAt)}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    {withoutReceiptFilter ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] border-border/50 bg-background/30 hover:bg-background/50"
                          onClick={() => onViewOrder(invoice.id)}
                        >
                          Ver pedido
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary shadow-sm hover:shadow-md"
                          onClick={() => onEmitOrder(invoice.id)}
                        >
                          Emitir
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                        onClick={() => router.push(`/dashboard/facturacion/${invoice.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-6 py-4 border-t border-border/50 bg-foreground/5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] border-border/50 bg-background/30 disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.max(1, typeof prev === 'number' ? prev - 1 : 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] border-border/50 bg-background/30 disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, typeof prev === 'number' ? prev + 1 : totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
