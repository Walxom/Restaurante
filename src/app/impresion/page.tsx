"use client"

import { Printer } from "lucide-react"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import ThermalPrintAdmin from "@/features/billing/components/ThermalPrintAdmin"
import PrinterConfiguration from "@/features/billing/components/PrinterConfiguration"
import { RoleGuard } from "@/components/auth/role-guard"

export default function ImpresionPage() {
  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="relative z-10 flex flex-col">
          <AdminPageHeader
            title="Administración de Impresión"
            subtitle="Servicios y configuración de hardware local"
            icon={Printer}
            backTo="/dashboard"
          />

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
