"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"

interface ConfigHeaderProps {
  hasChanges: boolean
  isSaving: boolean
  onReset: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function ConfigHeader({ hasChanges, isSaving, onReset, onSubmit }: ConfigHeaderProps) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/dashboard")} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
            <p className="text-xs text-gray-500">Ajustes generales del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={onReset} className="text-gray-600">
              <RotateCcw className="w-4 h-4 mr-2" />
              Descartar
            </Button>
          )}
          <Button size="sm" onClick={onSubmit} disabled={isSaving || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </header>
  )
}
