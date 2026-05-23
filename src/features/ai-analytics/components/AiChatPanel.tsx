"use client"

import { useState, useRef, useEffect } from "react"
import { useAiChat } from "@/features/ai-analytics/hooks/useAiChat"
import {
  MessageCircle,
  Send,
  RotateCcw,
  Brain,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AiChatPanel() {
  const { messages, isLoading, error, sendMessage, clearChat } = useAiChat()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput("")
  }

  const suggestions = [
    "Cuales son los platos mas vendidos?",
    "Que insumos estan por agotarse?",
    "Que productos se venden juntos?",
    "Recomiendame combinaciones del menu",
  ]

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-sm flex flex-col h-[550px] transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4 sm:p-6 border-b border-border/50 bg-foreground/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-in zoom-in-50 duration-500">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
              Chat con IA
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1 uppercase opacity-60">
              Consulta datos del negocio en lenguaje natural
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearChat}
          className="h-8 w-8 rounded-xl"
          title="Limpiar conversacion"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-2xl md:max-w-3xl rounded-2xl p-3.5 ${
                msg.role === "user"
                  ? "bg-primary/10 border border-primary/20"
                  : msg.type === "llm"
                  ? "bg-emerald-500/5 border border-emerald-500/10"
                  : msg.type === "error"
                  ? "bg-red-500/5 border border-red-500/10"
                  : "bg-muted/50 border border-border/50"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  {msg.type === "llm" ? (
                    <Brain className="w-3.5 h-3.5 text-emerald-500" />
                  ) : msg.type === "error" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    {msg.type === "llm" ? "IA" : msg.type === "error" ? "Error" : "Asistente"}
                  </span>
                </div>
              )}
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 border border-border/50 rounded-2xl p-3.5 max-w-[85%]">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  Pensando...
                </span>
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && !isLoading && (
          <div className="space-y-2 mt-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Preguntas sugeridas:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    sendMessage(s)
                  }}
                  className="px-3 py-1.5 bg-muted/30 hover:bg-muted/60 border border-border/50 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/5 border-t border-red-500/10">
          <p className="text-[10px] font-medium text-red-500">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border/50 bg-foreground/5 flex items-center gap-3 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={isLoading}
          className="flex-1 h-11 px-4 bg-background/50 border border-border/50 rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 hover:bg-background/80 transition-all disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
