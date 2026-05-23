"use client"

export function ConfigSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse w-full">
      <div className="lg:col-span-2 space-y-6">
        {/* Esqueleto de Pestañas */}
        <div className="h-14 bg-card/40 dark:bg-slate-900/30 border border-border/50 rounded-2xl w-full" />
        
        {/* Esqueleto de Card Formulario */}
        <div className="bg-card/40 dark:bg-slate-900/30 border border-border/50 rounded-3xl p-6 space-y-8">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-muted/60 dark:bg-slate-800/60" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted/60 dark:bg-slate-800/60 rounded w-1/3" />
              <div className="h-2.5 bg-muted/40 dark:bg-slate-800/40 rounded w-1/4" />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-3 bg-muted/50 dark:bg-slate-800/50 rounded w-1/4" />
                <div className="h-11 bg-muted/30 dark:bg-slate-800/30 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted/50 dark:bg-slate-800/50 rounded w-1/4" />
                <div className="h-11 bg-muted/30 dark:bg-slate-800/30 rounded-xl" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-3 bg-muted/50 dark:bg-slate-800/50 rounded w-1/4" />
                <div className="h-11 bg-muted/30 dark:bg-slate-800/30 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted/50 dark:bg-slate-800/50 rounded w-1/4" />
                <div className="h-11 bg-muted/30 dark:bg-slate-800/30 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Esqueleto de Barra Lateral */}
      <div className="space-y-6">
        <div className="bg-card/40 dark:bg-slate-900/30 border border-border/50 rounded-3xl p-6 h-[400px] flex flex-col justify-between">
          <div className="h-3 bg-muted/50 dark:bg-slate-800/50 rounded w-1/2 mx-auto" />
          <div className="h-64 bg-muted/20 dark:bg-slate-800/20 border border-dashed border-border/30 rounded-xl w-full max-w-[200px] mx-auto flex items-center justify-center">
            <div className="h-44 bg-muted/30 dark:bg-slate-800/30 rounded w-4/5" />
          </div>
          <div className="h-3 bg-muted/40 dark:bg-slate-800/40 rounded w-2/3 mx-auto" />
        </div>
        <div className="h-16 bg-card/40 dark:bg-slate-900/30 border border-border/50 rounded-2xl w-full" />
      </div>
    </div>
  )
}

