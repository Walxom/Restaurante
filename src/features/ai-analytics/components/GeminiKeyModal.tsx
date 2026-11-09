"use client"

import { useState, useEffect } from "react"
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  X,
  Trash2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface GeminiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isCurrentlyConfigured: boolean
  currentModel?: string
}

export default function GeminiKeyModal({
  isOpen,
  onClose,
  onSuccess,
  isCurrentlyConfigured,
  currentModel = "gemini-3.1-flash-lite",
}: GeminiKeyModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState(currentModel)
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [keyPreview, setKeyPreview] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null)
      setApiKey("")
      // Consultar estado actual
      fetch("/api/ai/config/gemini")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setKeyPreview(data.keyPreview || null)
            if (data.model) setModel(data.model)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      setStatusMessage({
        type: "error",
        text: "Por favor, ingresa una clave válida.",
      })
      return
    }

    setIsLoading(true)
    setStatusMessage(null)

    try {
      const res = await fetch("/api/ai/config/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), model }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Fallo en la validación de la API Key")
      }

      setStatusMessage({
        type: "success",
        text: data.message || "Clave verificada y activada exitosamente.",
      })
      setKeyPreview(data.gemini?.keyPreview || null)
      setApiKey("")

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setStatusMessage({
        type: "error",
        text: msg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    const confirm = window.confirm(
      "¿Deseas desvincular la API Key de Gemini? El asistente volverá al modo local con reglas predefinidas."
    )
    if (!confirm) return

    setIsDeleting(true)
    setStatusMessage(null)

    try {
      const res = await fetch("/api/ai/config/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      })

      if (!res.ok) {
        throw new Error("No se pudo desvincular la clave.")
      }

      setKeyPreview(null)
      setStatusMessage({
        type: "success",
        text: "Clave eliminada. El motor regresó a modo reglas locales.",
      })

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar"
      setStatusMessage({ type: "error", text: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-card border border-border/80 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Cabecera */}
        <div className="p-6 border-b border-border/50 bg-foreground/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                Configurar Google Gemini
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase opacity-70">
                Inteligencia Generativa y Conversacional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {/* Estado actual */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Estado Actual
              </span>
              <p className="text-xs font-bold text-foreground">
                {isCurrentlyConfigured ? (
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Conectado ({keyPreview || "Clave configurada"})
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Sin Clave (Reglas Locales Básicas)
                  </span>
                )}
              </p>
            </div>

            {isCurrentlyConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
                className="h-8 text-[9px] font-black uppercase tracking-wider text-red-500 border-red-500/20 hover:bg-red-500/10 gap-1.5 rounded-xl"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Desvincular
              </Button>
            )}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-foreground">
                API Key de Google Gemini
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy... o AQ...."
                  disabled={isLoading}
                  autoComplete="off"
                  className="w-full h-11 px-4 pr-11 bg-background/50 border border-border/60 rounded-xl text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-foreground">
                Modelo de Inteligencia Artificial
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3 bg-background/50 border border-border/60 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Recomendado - Free Tier Ultrarrápido)</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Free Tier Balanceado)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (Free Tier Alta Capacidad)</option>
              </select>
            </div>

            {/* Enlace para obtener clave gratis */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">¿Aún no tienes una clave de API?</p>
                <p className="text-[10px] leading-relaxed">
                  Google ofrece acceso gratuito para desarrolladores y negocios. Puedes generar tu clave en menos de 1 minuto sin costo:
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1"
                >
                  Obtener API Key gratis en Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Mensajes de retroalimentación */}
            {statusMessage && (
              <div
                className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium leading-relaxed">{statusMessage.text}</span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isLoading || !apiKey.trim()}
                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Validando con Google...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Validar y Guardar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
