"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import ThermalPrintAdmin from "@/components/ThermalPrintAdmin"
import PrinterConfiguration from "@/components/PrinterConfiguration"
import { RoleGuard } from "@/components/auth/role-guard"

export default function ImpresionPage() {
  const router = useRouter()

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header responsivo */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
                <Button 
                  onClick={() => router.push("/dashboard")} 
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 flex-shrink-0 p-2 sm:p-3"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1 lg:mr-2" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Dashboard</span>
                </Button>
                <div className="h-4 sm:h-6 w-px bg-gray-300 hidden sm:block flex-shrink-0"></div>
                <h1 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  <span className="sm:hidden">Impresión</span>
                  <span className="hidden sm:inline lg:hidden">Admin. Impresión</span>
                  <span className="hidden lg:inline">Administración de Impresión Térmica</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 pb-6 sm:pb-8">
          {/* Contenedor principal responsivo */}
          <div className="space-y-4 sm:space-y-6">
            {/* Configuración de Impresoras */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 xl:p-8 shadow-sm border border-gray-200">
              <PrinterConfiguration />
            </div>

            {/* Administración de Impresión */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 xl:p-8 shadow-sm border border-gray-200">
              <ThermalPrintAdmin />
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}