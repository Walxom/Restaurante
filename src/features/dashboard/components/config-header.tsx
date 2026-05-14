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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <Button 
            onClick={() => router.push("/dashboard")} 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                Configuración del Sistema
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Personalización y Ajustes Globales
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset} 
              className="h-9 rounded-xl font-black uppercase tracking-widest text-[10px] border-border/50 bg-background/30 hover:bg-background/50 text-rose-500 hover:text-rose-600 transition-all"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Descartar
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={onSubmit} 
            disabled={isSaving || !hasChanges} 
            className={`h-9 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 ${
              hasChanges 
                ? "bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30" 
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Save className="w-3 h-3 mr-2" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </header>
  )
}
