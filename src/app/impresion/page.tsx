"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import ThermalPrintAdmin from "@/features/billing/components/ThermalPrintAdmin"
import PrinterConfiguration from "@/features/billing/components/PrinterConfiguration"
import { RoleGuard } from "@/components/auth/role-guard"

export default function ImpresionPage() {
  const router = useRouter()

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        {/* Fondo con gradientes dinámicos */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col">
          {/* Header Premium */}
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
                    <Printer className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-widest truncate">
                      <span className="inline sm:hidden">Impresión</span>
                      <span className="hidden sm:inline">Administración de Impresión</span>
                    </h1>
                    <p className="hidden md:block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                      Servicios y Configuración de Hardware
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna de Administración de Servicio (Software) */}
              <div className="lg:col-span-5 xl:col-span-4">
                <ThermalPrintAdmin />
              </div>

              {/* Columna de Configuración de Impresoras (Hardware) */}
              <div className="lg:col-span-7 xl:col-span-8">
                <PrinterConfiguration />
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}