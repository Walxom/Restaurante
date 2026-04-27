"use client"

import { CheckCircle2, AlertCircle } from "lucide-react"

interface StatusIndicatorProps {
  hasChanges: boolean
}

export function StatusIndicator({ hasChanges }: StatusIndicatorProps) {
  if (!hasChanges) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 shadow-sm">
        <div className="bg-emerald-500 p-1 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs text-emerald-700 font-semibold tracking-tight">Sin cambios pendientes</p>
      </div>
    )
  }
  return (
    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 shadow-sm animate-pulse">
      <div className="bg-amber-500 p-1 rounded-full">
        <AlertCircle className="w-4 h-4 text-white" />
      </div>
      <p className="text-xs text-amber-700 font-semibold tracking-tight">Tienes cambios sin guardar</p>
    </div>
  )
}
