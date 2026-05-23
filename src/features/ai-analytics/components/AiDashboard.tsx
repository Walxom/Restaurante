"use client"

import ForecastChart from "./ForecastChart"
import InventoryAlertPanel from "./InventoryAlertPanel"
import MarketBasketSuggestions from "./MarketBasketSuggestions"
import AiChatPanel from "./AiChatPanel"
import { useAiHealth } from "@/features/ai-analytics/hooks/useAiInsights"
import { Brain, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"

export default function AiDashboard() {
  const { health, isAiOnline, isLoading: healthLoading } = useAiHealth()

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">
                      Inteligencia de Negocio
                    </h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                      Analitica predictiva con IA Hibrida
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {healthLoading ? (
                    <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
                  ) : (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                      isAiOnline
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-red-500/10 border-red-500/20 text-red-500"
                    }`}>
                      {isAiOnline ? (
                        <><Wifi className="w-3 h-3" /> AI Activo</>
                      ) : (
                        <><WifiOff className="w-3 h-3" /> Desconectado</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {!isAiOnline && !healthLoading && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Motor de IA no disponible
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Ejecuta el microservicio Python: `cd ai_engine && uvicorn main:app --reload --port 8000`
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <ForecastChart />
              <InventoryAlertPanel />
            </div>

            <MarketBasketSuggestions />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <AiChatPanel />
              <div className="hidden xl:block" />
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
