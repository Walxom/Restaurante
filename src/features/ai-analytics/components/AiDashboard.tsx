"use client"

import { useState } from "react"
import ForecastChart from "./ForecastChart"
import InventoryAlertPanel from "./InventoryAlertPanel"
import MarketBasketSuggestions from "./MarketBasketSuggestions"
import AiChatPanel from "./AiChatPanel"
import GeminiKeyModal from "./GeminiKeyModal"
import {
  useAiHealth,
  triggerRetrainAll,
  startAiService,
  stopAiService,
  getAiServiceLogs,
} from "@/features/ai-analytics/hooks/useAiInsights"
import {
  Brain,
  Wifi,
  RefreshCw,
  Terminal,
  Play,
  Power,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Sparkles,
  Key,
} from "lucide-react"
import { RoleGuard } from "@/components/auth/role-guard"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"

export default function AiDashboard() {
  const {
    isAiOnline,
    isGeminiConfigured,
    geminiModel,
    isLoading: healthLoading,
    mutate,
  } = useAiHealth()
  const [isRetraining, setIsRetraining] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [startStep, setStartStep] = useState<string>("")
  const [showManualCommands, setShowManualCommands] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStartAi = async () => {
    setIsStarting(true)
    setErrorMessage(null)
    setShowLogs(false)
    setStartStep("Lanzando microservicio en segundo plano...")

    try {
      await startAiService()
      setStartStep("Verificando modelos y preparando socket :8000...")

      let attempts = 0
      const maxAttempts = 20
      const pollInterval = setInterval(async () => {
        attempts++

        if (attempts === 4) {
          setStartStep("Cargando modelos predictivos (Prophet / Scikit-Learn)...")
        } else if (attempts === 8) {
          setStartStep("Inicializando reglas de asociación y caché...")
        } else if (attempts === 12) {
          setStartStep("Estableciendo enlace de alta velocidad...")
        }

        try {
          const res = await mutate()
          if (res && res.status === "ok") {
            clearInterval(pollInterval)
            setIsStarting(false)
            setStartStep("")
            return
          }
        } catch {
          // Aún no responde el puerto
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setIsStarting(false)
          setStartStep("")
          setErrorMessage(
            "El microservicio tardó más de 30 segundos en inicializarse. Revisa los registros para diagnosticar el problema."
          )
          const fetchedLogs = await getAiServiceLogs()
          setLogs(fetchedLogs)
          setShowLogs(true)
        }
      }, 1500)
    } catch (err: unknown) {
      setIsStarting(false)
      setStartStep("")
      const message = err instanceof Error ? err.message : "Error al iniciar el motor de IA"
      setErrorMessage(message)
      const fetchedLogs = await getAiServiceLogs()
      setLogs(fetchedLogs)
    }
  }

  const handleStopAi = async () => {
    const confirmed = window.confirm(
      "¿Deseas detener el microservicio de IA para liberar recursos de memoria del servidor?"
    )
    if (!confirmed) return

    setIsStopping(true)
    try {
      await stopAiService()
      await mutate(undefined, { revalidate: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      alert("Error al detener el servicio: " + message)
    } finally {
      setIsStopping(false)
    }
  }

  const handleRetrain = async () => {
    setIsRetraining(true)
    try {
      const res = await triggerRetrainAll()
      alert(res.message || "Modelos reentrenados correctamente")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      alert("Error al reentrenar: " + message)
    } finally {
      setIsRetraining(false)
    }
  }

  const handleFetchLogs = async () => {
    setShowLogs(!showLogs)
    if (!showLogs) {
      const fetchedLogs = await getAiServiceLogs()
      setLogs(fetchedLogs)
    }
  }

  const renderContent = () => {
    if (healthLoading && !isStarting) {
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
        <div className="max-w-lg mx-auto bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-7 sm:p-8 shadow-sm transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                isStarting
                  ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/10"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}
            >
              {isStarting ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <Terminal className="w-8 h-8 text-red-500 animate-pulse" />
              )}
            </div>
            {isStarting && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
              </span>
            )}
          </div>

          <div className="space-y-2 text-center w-full">
            <h2 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">
              {isStarting ? "Inicializando Motor de IA..." : "Motor de IA Desconectado"}
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-wider opacity-70">
              {isStarting
                ? "Iniciando proceso en segundo plano y cargando modelos"
                : "El microservicio Python FastAPI no se encuentra en ejecución"}
            </p>
          </div>

          {errorMessage && (
            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-left text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px] leading-relaxed">
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {isStarting ? (
            <div className="w-full space-y-3.5 bg-background/50 border border-border/50 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                <Sparkles className="w-4 h-4 animate-bounce" />
                <span>{startStep || "Procesando arranque..."}</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full animate-pulse w-3/4 transition-all duration-700" />
              </div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest opacity-60">
                La página se activará automáticamente al conectar
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <Button
                variant="default"
                size="lg"
                disabled={isStarting}
                onClick={handleStartAi}
                className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Arrancar Motor de IA
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-background/40 border-border/50 hover:bg-background/80 text-foreground transition-all duration-300 gap-2"
                onClick={() => mutate()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar Verificación
              </Button>
            </div>
          )}

          {/* Sección colapsable de diagnóstico y registros */}
          <div className="w-full border-t border-border/40 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <button
                type="button"
                onClick={() => setShowManualCommands(!showManualCommands)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {showManualCommands ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>Comandos de consola manual</span>
              </button>

              <button
                type="button"
                onClick={handleFetchLogs}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showLogs ? "Ocultar logs" : "Ver diagnóstico"}</span>
              </button>
            </div>

            {showManualCommands && (
              <div className="bg-background/90 border border-border/50 rounded-xl p-3.5 font-mono text-[10px] text-left text-muted-foreground/90 leading-relaxed select-all animate-in fade-in">
                <span className="text-muted-foreground/50"># Terminal alternativa:</span>
                <br />
                cd ai_engine
                <br />
                uvicorn main:app --reload --port 8000
                <br />
                <span className="text-primary font-bold mt-1 inline-block">pnpm dev:ai</span>
              </div>
            )}

            {showLogs && (
              <div className="bg-background/95 border border-border/60 rounded-xl p-3 font-mono text-[9px] text-left text-muted-foreground max-h-40 overflow-y-auto space-y-1 animate-in fade-in select-all">
                {logs.length > 0 ? (
                  logs.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-tight">
                      {line}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground/50 italic">
                    No hay registros de arranque recientes en logs/ai-engine.log
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-500 w-fit">
              <Wifi className="w-3 h-3" />
              Modelos Locales Conectados
            </div>

            {isGeminiConfigured ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-500 w-fit">
                <Sparkles className="w-3 h-3" />
                Gemini LLM: {geminiModel}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-500 w-fit">
                <AlertTriangle className="w-3 h-3" />
                Gemini LLM: Sin Configurar (Reglas Locales)
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsKeyModalOpen(true)}
              className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all gap-1.5"
            >
              <Key className="w-3 h-3" />
              {isGeminiConfigured ? "Gestionar Gemini" : "Configurar Gemini"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isRetraining}
              onClick={handleRetrain}
              className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${isRetraining ? "animate-spin" : ""}`} />
              {isRetraining ? "Entrenando..." : "Reentrenar Modelos"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isStopping}
              onClick={handleStopAi}
              title="Detener microservicio para liberar recursos"
              className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-500 hover:text-red-600 transition-all gap-1.5"
            >
              <Power className={`w-3 h-3 ${isStopping ? "animate-spin" : ""}`} />
              {isStopping ? "Deteniendo..." : "Detener Motor"}
            </Button>
          </div>
        </div>

        {!isGeminiConfigured && (
          <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
                  Google Gemini no configurado - Asistente en modo local limitado
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Las predicciones matemáticas de demanda e inventario están activas, pero el chat cognitivo opera únicamente con plantillas estáticas de palabras clave. Añade tu API Key de Google Gemini gratuita para habilitar comprensión conversacional fluida.
                </p>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsKeyModalOpen(true)}
              className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:shadow-lg transition-all shrink-0 gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              Configurar Clave
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          <ForecastChart />
          <InventoryAlertPanel />
        </div>

        <MarketBasketSuggestions />

        <div className="w-full">
          <AiChatPanel onOpenGeminiConfig={() => setIsKeyModalOpen(true)} />
        </div>

        <GeminiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onSuccess={() => mutate()}
          isCurrentlyConfigured={isGeminiConfigured}
          currentModel={geminiModel}
        />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title="Inteligencia de Negocio"
            subtitle="Analítica Predictiva con IA Híbrida"
            icon={Brain}
            backTo="/dashboard"
          />

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
