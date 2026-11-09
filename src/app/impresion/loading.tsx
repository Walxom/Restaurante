export default function ImpresionLoading() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="relative z-10 flex flex-col">
        {/* Cabecera Esqueleto */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div className="h-9 w-9 bg-muted/40 rounded-xl animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted/50 rounded w-1/4 animate-pulse" />
                <div className="h-3 bg-muted/30 rounded w-1/5 animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-24 bg-muted/40 rounded-xl animate-pulse" />
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse w-full">
            
            {/* Esqueleto Panel de Servicio (Software) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="bg-card/40 border border-border/50 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border/50 bg-foreground/5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-muted/60" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 bg-muted/60 rounded w-1/2" />
                    <div className="h-2.5 bg-muted/40 rounded w-1/3" />
                  </div>
                </div>
                <div className="p-8 flex flex-col items-center justify-center space-y-8 border-b border-border/50">
                  <div className="p-6 rounded-[2rem] border border-border/30 bg-muted/20 h-24 w-24 flex items-center justify-center">
                    <div className="h-12 w-12 bg-muted/30 rounded-xl" />
                  </div>
                  <div className="flex gap-2 justify-center w-full">
                    <div className="h-6 w-24 bg-muted/40 rounded-xl" />
                    <div className="h-6 w-24 bg-muted/40 rounded-xl" />
                  </div>
                  <div className="h-3 bg-muted/30 rounded w-2/3" />
                </div>
                <div className="p-8 bg-foreground/[0.02] space-y-4">
                  <div className="h-12 bg-muted/30 rounded-2xl w-full" />
                </div>
              </div>
            </div>

            {/* Esqueleto Configuración de Impresoras (Hardware) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="h-14 bg-card/40 border border-border/50 rounded-2xl w-full" />
              
              <div className="bg-card/40 border border-border/50 rounded-3xl p-6 space-y-8">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted/60 rounded w-1/3" />
                    <div className="h-2.5 bg-muted/40 rounded w-1/4" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-1/4" />
                      <div className="h-11 bg-muted/30 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-1/4" />
                      <div className="h-11 bg-muted/30 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-1/4" />
                      <div className="h-11 bg-muted/30 rounded-xl" />
                    </div>
                  </div>
                  <div className="h-14 bg-muted/20 rounded-2xl w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-muted/30 rounded-2xl" />
                    <div className="h-12 bg-muted/30 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
