export default function ConfiguracionLoading() {
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse w-full">
            <div className="lg:col-span-2 space-y-6">
              {/* Esqueleto de Pestañas */}
              <div className="h-14 bg-card/40 border border-border/50 rounded-2xl w-full" />
              
              {/* Esqueleto de Card Formulario */}
              <div className="bg-card/40 border border-border/50 rounded-3xl p-6 space-y-8">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="h-10 w-10 rounded-2xl bg-muted/60" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted/60 rounded w-1/3" />
                    <div className="h-2.5 bg-muted/40 rounded w-1/4" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-1/4" />
                      <div className="h-11 bg-muted/30 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-1/4" />
                      <div className="h-11 bg-muted/30 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Esqueleto de Barra Lateral */}
            <div className="space-y-6">
              <div className="bg-card/40 border border-border/50 rounded-3xl p-6 h-[400px]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
