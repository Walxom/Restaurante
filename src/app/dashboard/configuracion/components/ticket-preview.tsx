"use client"

import { AlertCircle } from "lucide-react"

interface TicketPreviewProps {
  config: any
  taxPercentage: string
}

export function TicketPreview({ config, taxPercentage }: TicketPreviewProps) {
  if (!config) return null

  return (
    <div className="sticky top-24 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-foreground/5">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">
            Vista Previa de Impresión
          </h2>
        </div>
        <div className="p-8 flex justify-center bg-slate-900/5 dark:bg-slate-50/5 relative overflow-hidden">
          {/* Efecto de papel térmico */}
          <div className="w-full max-w-[280px] bg-white dark:bg-slate-50 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.05)] relative transform hover:scale-[1.02] transition-transform duration-500">
            {/* Bordes dentados simulados (arriba y abajo) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#f1f5f9_2px,_transparent_0)] bg-[length:8px_8px] bg-repeat-x -translate-y-1/2 opacity-20" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#f1f5f9_2px,_transparent_0)] bg-[length:8px_8px] bg-repeat-x translate-y-1/2 opacity-20" />

            <div className="space-y-4 font-mono text-[10px] text-slate-800">
              <div className="text-center space-y-1.5 pb-4 border-b border-dashed border-slate-300">
                <h3 className="font-black text-sm uppercase leading-tight tracking-tighter text-slate-950">
                  {config.companyName || "NOMBRE DEL RESTAURANTE"}
                </h3>
                {config.companyRuc && <p className="font-bold opacity-80">RUC: {config.companyRuc}</p>}
                {config.companyAddress && (
                  <p className="leading-tight text-[9px] opacity-70 italic max-w-[180px] mx-auto">
                    {config.companyAddress}
                  </p>
                )}
                {config.companyPhone && <p className="font-bold opacity-80">TEL: {config.companyPhone}</p>}
              </div>
              <div className="py-2 space-y-1 text-[9px]">
                <div className="flex justify-between font-bold"><span>BOLETA ELECTRÓNICA</span><span>B001-000452</span></div>
                <div className="flex justify-between opacity-60"><span>FECHA:</span><span>{new Date().toLocaleDateString()}</span></div>
              </div>

              <div className="border-t border-dashed border-slate-300 py-3 space-y-1.5">
                <div className="flex justify-between"><span>1x Menú del Día (Lomo Saltado)</span><span>15.00</span></div>
                <div className="flex justify-between"><span>1x Gaseosa 500ml (Inca Kola)</span><span>3.50</span></div>
              </div>

              <div className="border-t-2 border-double border-slate-900 pt-3 space-y-1.5">
                <div className="flex justify-between opacity-60"><span>SUBTOTAL</span><span>{(18.50 / (1 + parseFloat(taxPercentage)/100)).toFixed(2)}</span></div>
                <div className="flex justify-between font-black"><span>IGV ({taxPercentage}%)</span><span>{(18.50 - (18.50 / (1 + parseFloat(taxPercentage)/100))).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs pt-1 font-black text-slate-950 border-t border-slate-900">
                  <span>TOTAL</span>
                  <span>{config.currency || "S/"} 18.50</span>
                </div>
              </div>

              <div className="text-center pt-4 text-[9px] font-bold text-slate-400 border-t border-dashed border-slate-200 mt-4 uppercase tracking-widest">
                ¡Gracias por su preferencia!
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="bg-primary/10 p-1.5 rounded-lg">
          <AlertCircle className="w-4 h-4 text-primary" />
        </div>
        <p className="text-[10px] font-bold text-primary/80 leading-relaxed uppercase tracking-wider">
          Los cambios realizados se aplicarán instantáneamente a todos los comprobantes generados.
        </p>
      </div>
    </div>
  )
}
