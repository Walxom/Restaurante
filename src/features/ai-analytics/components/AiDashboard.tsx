"use client"

import ForecastChart from "./ForecastChart"
import InventoryAlertPanel from "./InventoryAlertPanel"
import MarketBasketSuggestions from "./MarketBasketSuggestions"
import AiChatPanel from "./AiChatPanel"
import { useAiHealth } from "@/features/ai-analytics/hooks/useAiInsights"
import { Brain, Wifi, WifiOff, RefreshCw, Terminal, Play } from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"

export default function AiDashboard() {
  const { isAiOnline, isLoading: healthLoading } = useAiHealth()

  const renderContent = () => {
    if (healthLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em]">
              Conectando al motor de IA
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Verificando servicio en puerto 8000...
            </p>
          </div>
        </div>
      )
    }

    if (!isAiOnline) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="h-20 w-20 rounded-3xl bg-red-500/5 flex items-center justify-center border border-red-500/10">
            <Terminal className="w-10 h-10 text-red-400" />
          </div>
          <div className="space-y-3 text-center max-w-md">
            <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">
              Motor de IA no disponible
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
              El microservicio Python no está corriendo. Abre una terminal y ejecuta:
            </p>
            <div className="bg-muted/50 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-left text-muted-foreground">
              cd ai_engine<br />
              uvicorn main:app --reload --port 8000
            </div>
            <p className="text-[9px] font-medium text-muted-foreground/60">
              O usa el comando unificado: <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[9px]">pnpm dev:ai</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Reintentar conexion
            </Button>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-500 w-fit mb-6">
          <Wifi className="w-3 h-3" />
          AI Conectado - Datos en tiempo real
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <ForecastChart />
          <InventoryAlertPanel />
        </div>

        <MarketBasketSuggestions />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <AiChatPanel />
          <div className="hidden xl:block" />
        </div>
      </>
    )
  }

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
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
