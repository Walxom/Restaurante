"use client"

import { useEffect, useRef, useState } from "react"
import { getNivelSla } from "@/features/orders/utils/sla"

/** Reloj que se actualiza cada `intervaloMs` para recalcular el SLA en pantalla. */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return ahora
}

/** Bip corto con Web Audio API (sin archivos de audio). Falla en silencio si el navegador lo bloquea. */
function reproducirBip() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => void ctx.close()
  } catch {
    // Autoplay bloqueado o navegador sin Web Audio: la alerta visual sigue activa.
  }
}

interface PedidoConSla {
  id: string
  status: string
  createdAt: string | Date
}

/**
 * US-14: emite un bip la primera vez que un pedido pasa a ROJO (> 18 min).
 * Cada pedido suena una sola vez para no saturar la cocina.
 */
export function useSlaBeep(pedidos: PedidoConSla[], ahora: number) {
  const yaAlertados = useRef(new Set<string>())
  useEffect(() => {
    let nuevos = 0
    for (const p of pedidos) {
      if (getNivelSla(p.status, p.createdAt, ahora) === "ROJO" && !yaAlertados.current.has(p.id)) {
        yaAlertados.current.add(p.id)
        nuevos++
      }
    }
    if (nuevos > 0) reproducirBip()
  }, [pedidos, ahora])
}
