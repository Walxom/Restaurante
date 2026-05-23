"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw, Save, Settings } from "lucide-react"

interface ConfigHeaderProps {
  hasChanges: boolean
  isSaving: boolean
  onReset: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function ConfigHeader({ hasChanges, isSaving, onReset, onSubmit }: ConfigHeaderProps) {
  const router = useRouter()
  return (
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
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-widest truncate">
                <span className="inline sm:hidden">Configuración</span>
                <span className="hidden sm:inline">Configuración del Sistema</span>
              </h1>
              <p className="hidden md:block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                Personalización y Ajustes Globales
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasChanges && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const confirmed = window.confirm("¿Estás seguro de que deseas descartar los cambios no guardados?")
                if (confirmed) {
                  onReset()
                }
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
        </div>
      </div>
    </header>
  )
}

