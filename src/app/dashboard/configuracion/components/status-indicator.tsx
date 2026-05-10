"use client"

import { CheckCircle2, AlertCircle } from "lucide-react"

interface StatusIndicatorProps {
  hasChanges: boolean
}

export function StatusIndicator({ hasChanges }: StatusIndicatorProps) {
  if (!hasChanges) {
    return (
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 transition-all duration-500">
        <div className="bg-emerald-500/20 p-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Sistema al día</p>
          <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">Sin cambios pendientes</p>
        </div>
      </div>
    )
  }
  return (
    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4 animate-pulse">
      <div className="bg-orange-500/20 p-2 rounded-xl">
        <AlertCircle className="w-4 h-4 text-orange-500" />
      </div>
      <div>
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Cambios Detectados</p>
        <p className="text-[9px] font-bold text-orange-500/60 uppercase tracking-widest mt-1 text-balance">Necesitas guardar para aplicar</p>
      </div>
    </div>
  )
}
