"use client"

import { ChefHat, Loader2 } from "lucide-react"

export function AppLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Fondo con gradiente coherente con el dashboard */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Contenedor del Icono con animación de pulso */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 ring-8 ring-blue-500/5 animate-pulse">
            <ChefHat className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
          
          {/* Spinner perimetral */}
          <div className="absolute -inset-4 border-2 border-primary/20 border-t-primary rounded-[2.5rem] animate-spin duration-700" />
        </div>

        {/* Texto informativo de alta densidad */}
        <div className="text-center space-y-2">
          <h2 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] opacity-80 animate-pulse">
            Autenticando Acceso
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-4 bg-primary/30" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
              Verificando credenciales operativas
            </p>
            <div className="h-[1px] w-4 bg-primary/30" />
          </div>
        </div>
      </div>

      {/* Decoración ambiental */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  )
}
