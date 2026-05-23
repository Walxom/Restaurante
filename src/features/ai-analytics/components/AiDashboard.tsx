"use client"

import { useRouter } from "next/navigation"
import ForecastChart from "./ForecastChart"
import InventoryAlertPanel from "./InventoryAlertPanel"
import MarketBasketSuggestions from "./MarketBasketSuggestions"
import AiChatPanel from "./AiChatPanel"
import { useAiHealth } from "@/features/ai-analytics/hooks/useAiInsights"
import { Brain, Wifi, RefreshCw, Terminal, ArrowLeft } from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"

export default function AiDashboard() {
  const router = useRouter()
  const { isAiOnline, isLoading: healthLoading } = useAiHealth()

  const renderContent = () => {
    if (healthLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-500">
          <div className="relative h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm shadow-primary/5">
            <div className="absolute inset-0 rounded-3xl border border-primary/20 animate-ping opacity-25" />
            <Brain className="w-9 h-9 text-primary animate-pulse" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-xs font-black text-foreground uppercase tracking-[0.25em]">
              Conectando al motor de IA
            </h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Verificando servicio en puerto 8000...
            </p>
          </div>
        </div>
      )
    }

    if (!isAiOnline) {
      return (
        <div className="max-w-md mx-auto bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Terminal className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div className="space-y-3 text-center w-full">
            <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">
              Motor de IA no disponible
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-wider opacity-60">
              El microservicio Python está desconectado
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed text-left">
              Para habilitar las predicciones e insights de IA, inicia el servidor en segundo plano:
            </p>
            <div className="bg-background/80 border border-border/50 rounded-xl p-3.5 font-mono text-[10px] text-left text-muted-foreground/90 leading-relaxed select-all">
              cd ai_engine<br />
              uvicorn main:app --reload --port 8000
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest text-left">
              O con pnpm: <code className="bg-background/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-primary font-bold">pnpm dev:ai</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest bg-background/50 border-border/50 hover:bg-background/80 text-foreground transition-all duration-300"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Reintentar conexión
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-500 w-fit">
          <Wifi className="w-3 h-3" />
          AI Conectado - Datos en tiempo real
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          <ForecastChart />
          <InventoryAlertPanel />
        </div>

        <MarketBasketSuggestions />

        <div className="w-full">
          <AiChatPanel />
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button 
                  onClick={() => router.push("/dashboard")} 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300"
                  aria-label="Volver al panel"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-widest truncate">
                      <span className="inline sm:hidden">Inteligencia</span>
                      <span className="hidden sm:inline">Inteligencia de Negocio</span>
                    </h1>
                    <p className="hidden md:block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                      Analítica Predictiva con IA Híbrida
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
