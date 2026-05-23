"use client"

import { useState, useRef, useCallback } from "react"
import type { ChatMessage } from "@/features/ai-analytics/types/ai.types"

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000"

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hola, soy el asistente de inteligencia de negocio de Fondo Marino. Puedo ayudarte con informacion sobre ventas, inventario, pronosticos y recomendaciones. ¿Que deseas consultar?",
    type: "fallback"
  }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<Array<{ role: string; content: string }>>([])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${AI_ENGINE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyRef.current.slice(-10)
        })
      })

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.content,
        timestamp: data.timestamp,
        type: data.type || "fallback"
      }

      setMessages((prev) => [...prev, assistantMsg])
      historyRef.current.push({ role: "user", content: message })
      historyRef.current.push({ role: "assistant", content: data.content })

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error de conexion"
      setError(errMsg)
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Lo siento, no pude conectar con el motor de IA. Verifica que el servicio este activo en ${AI_ENGINE_URL}.`,
        type: "error"
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const clearChat = useCallback(() => {
    setMessages([{
      role: "assistant",
      content: "Hola, soy el asistente de inteligencia de negocio de Fondo Marino. Puedo ayudarte con informacion sobre ventas, inventario, pronosticos y recomendaciones. ¿Que deseas consultar?",
      type: "fallback"
    }])
    historyRef.current = []
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat
  }
}
