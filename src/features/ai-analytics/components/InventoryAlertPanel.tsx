"use client"

import { useState } from "react"
import { useInventoryForecast } from "@/features/ai-analytics/hooks/useInventoryForecast"
import {
  AlertTriangle,
  Package,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InventoryAlertPanel() {
  const { alerts, stats, narrative, isLoading, error, refresh } = useInventoryForecast()
  const [expanded, setExpanded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const visibleAlerts = expanded ? alerts : [...stats.critical, ...stats.warning].slice(0, 6)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                Inventario Predictivo
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1">
                Alertas de stock basadas en demanda proyectada
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.critical > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-[9px] font-black text-red-500">{stats.critical}</span>
              </div>
            )}
            {stats.warning > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-500">{stats.warning}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-red-500/50 mx-auto mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Error: {error.message}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
            <p className="text-xs font-bold text-emerald-500">Todos los insumos en nivel optimo</p>
          </div>
        ) : (
          <>
            {visibleAlerts.map((alert) => (
              <div
                key={alert.ingredient_id}
                className={`p-3 rounded-xl border ${
                  alert.status === "CRITICAL"
                    ? "bg-red-500/5 border-red-500/20"
                    : alert.status === "WARNING"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-emerald-500/5 border-emerald-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.status === "CRITICAL" ? "bg-red-500" :
                      alert.status === "WARNING" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <span className="text-xs font-bold text-foreground">{alert.ingredient_name}</span>
                    <span className="text-[9px] font-medium text-muted-foreground">{alert.unit}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    alert.status === "CRITICAL" ? "text-red-500" :
                    alert.status === "WARNING" ? "text-amber-500" : "text-emerald-500"
                  }`}>{alert.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground">
                  <span>Stock: <strong className="text-foreground">{alert.current_stock}</strong></span>
                  <span>Demanda: <strong className="text-foreground">{alert.predicted_daily_demand}/dia</strong></span>
                  {alert.days_until_stockout !== null && (
                    <span>
                      {alert.days_until_stockout <= 1 ? "⚠️ HOY" :
                       `${Math.ceil(alert.days_until_stockout)} dias`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {alerts.length > 6 && (
              <Button
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {expanded ? (
                  <><ChevronUp className="w-4 h-4 mr-2" /> Mostrar menos</>
                ) : (
                  <><ChevronDown className="w-4 h-4 mr-2" /> Ver {alerts.length - 6} alertas mas</>
                )}
              </Button>
            )}
          </>
        )}
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
