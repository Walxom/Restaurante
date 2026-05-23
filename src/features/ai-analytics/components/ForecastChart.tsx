"use client"

import { useForecast } from "@/features/ai-analytics/hooks/useAiInsights"
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"

export default function ForecastChart() {
  const { forecast, narrative, isLoading, error } = useForecast()
  const top5 = forecast.slice(0, 5)

  if (isLoading) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Error al conectar con el motor de IA: {error.message}</p>
        </div>
      </div>
    )
  }

  if (forecast.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-6">
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Sin datos de prediccion
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Se necesitan ordenes historicas para generar forecasting.
          </p>
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...top5.map((f) => f.total_predicted), 1)

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
              Forecasting de Demanda
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1">
              Proyeccion a 7 dias
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-3">
        {top5.map((f) => {
          const barWidth = Math.max(8, (f.total_predicted / maxValue) * 100)
          return (
            <div key={f.product_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                  {f.product_name}
                </span>
                <span className="text-xs font-black text-primary tabular-nums">
                  {f.total_predicted} uds.
                </span>
              </div>
              <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground tracking-wider">
                <span>~{f.avg_daily} / dia</span>
                <span className={f.avg_daily > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                  {f.avg_daily > 0 ? (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Estable
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Minus className="w-3 h-3" /> Sin datos
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {narrative && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${
            narrative.type === "llm"
              ? "bg-primary/5 border border-primary/10 text-foreground"
              : "bg-amber-500/5 border border-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}>
            <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-60">
              {narrative.type === "llm" ? "🧠 Insight IA" : "⚠️ Alerta Local"}
            </span>
            {narrative.mensaje}
          </div>
        </div>
      )}
    </div>
  )
}
