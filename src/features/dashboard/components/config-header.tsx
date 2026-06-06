"use client"

import { Button } from "@/components/ui/button"
import { RotateCcw, Save, Settings } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"

interface ConfigHeaderProps {
  hasChanges: boolean
  isSaving: boolean
  onReset: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function ConfigHeader({ hasChanges, isSaving, onReset, onSubmit }: ConfigHeaderProps) {
  return (
    <AdminPageHeader
      title="Configuración del Sistema"
      subtitle="Personalización y Ajustes Globales"
      icon={Settings}
      backTo="/dashboard"
    >
      {hasChanges && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const confirmed = window.confirm("¿Estás seguro de que deseas descartar los cambios no guardados?")
            if (confirmed) onReset()
          }}
          className="h-9 px-2.5 sm:px-4 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] border-border/50 bg-background/30 hover:bg-background/50 text-rose-500 hover:text-rose-600 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:mr-2" />
          <span className="hidden sm:inline">Descartar</span>
        </Button>
      )}
      <Button
        size="sm"
        onClick={onSubmit}
        disabled={isSaving || !hasChanges}
        className={`h-9 px-3 sm:px-4 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all duration-300 ${
          hasChanges
            ? "bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isSaving ? (
          <>
            <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2" />
            <span className="hidden sm:inline">Guardando...</span>
            <span className="sm:hidden">Guardando</span>
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5 sm:mr-2" />
            <span className="hidden sm:inline">Guardar Cambios</span>
            <span className="sm:hidden">Guardar</span>
          </>
        )}
      </Button>
    </AdminPageHeader>
  )
}

