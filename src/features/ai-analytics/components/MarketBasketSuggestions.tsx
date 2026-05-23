"use client"

import { useMarketBasket } from "@/features/ai-analytics/hooks/useAiInsights"
import {
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react"

export default function MarketBasketSuggestions() {
  const { rules, narrative, isLoading, error } = useMarketBasket()

  if (isLoading) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm animate-in fade-in duration-300">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded-xl" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-black text-red-500 uppercase tracking-widest text-[10px]">Error al generar reglas de asociación: {error.message}</p>
        </div>
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="text-center py-16 sm:py-24 flex flex-col items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-5 animate-pulse" />
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">
            Sin reglas de asociación
          </p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-3 max-w-xs leading-relaxed">
            Se necesitan más transacciones para detectar patrones de compra.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-sm transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4 sm:p-6 border-b border-border/50 bg-foreground/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 animate-in zoom-in-50 duration-500">
              <ShoppingBag className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                Canasta de Compra
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1 uppercase opacity-60">
                Reglas de asociación entre productos
              </p>
            </div>
          </div>
          <div className="h-8 px-3 bg-purple-500/10 rounded-full border border-purple-500/20 flex items-center gap-1.5 transition-all duration-300">
            <BarChart3 className="w-3 h-3 text-purple-500" />
            <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">{rules.length} reglas</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {rules.slice(0, 6).map((rule, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-500/[0.03] to-transparent border border-purple-500/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  {rule.antecedents.join(", ")}
                </span>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="text-xs font-bold text-primary">
                  {rule.consequents.join(", ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                Confianza: <strong className="text-foreground">{(rule.confidence * 100).toFixed(0)}%</strong>
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Lift: <strong className="text-foreground">{rule.lift.toFixed(2)}</strong>
              </span>
              <span>
                Soporte: <strong className="text-foreground">{(rule.support * 100).toFixed(1)}%</strong>
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500/60 to-purple-500 rounded-full"
                style={{ width: `${Math.min(100, rule.confidence * 100)}%` }}
              />
            </div>
          </div>
        ))}
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
