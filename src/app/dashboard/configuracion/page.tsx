"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Building2, Settings } from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"

// Componentes locales
import { ConfigHeader } from "./components/config-header"
import { RestaurantInfoCard } from "./components/restaurant-info-card"
import { SystemSettingsCard } from "./components/system-settings-card"
import { TicketPreview } from "./components/ticket-preview"
import { StatusIndicator } from "./components/status-indicator"

// Utils y Config
import { 
  getSupportedTimezones, 
  type SystemConfigData as SystemConfig 
} from "@/services/system.service"

import { ConfigSkeleton } from "./components/config-skeleton"

import { RoleGuard } from "@/components/auth/role-guard"

export default function ConfiguracionSistemaPage() {
  const router = useRouter()
  
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [taxPercentage, setTaxPercentage] = useState<string>("0")

  const timezones = getSupportedTimezones()

  // Cargar configuración actual
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/system-config")
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
          setOriginalConfig(data)
          setTaxPercentage((data.taxRate * 100).toString())
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error)
        toast.error("Error al cargar la configuración")
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // Sincronizar cambios
  useEffect(() => {
    if (config && originalConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(originalConfig)
      setHasChanges(changed)
    }
  }, [config, originalConfig])

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 0) return ''
    if (numbers[0] !== '9') return ''
    const limited = numbers.slice(0, 9)
    if (limited.length <= 3) return limited
    if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`
    return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`
  }

  const handleInputChange = (field: keyof SystemConfig, value: string | number) => {
    if (!config) return
    setConfig(prev => prev ? ({ ...prev, [field]: value }) : null)
  }

  const handleTaxChange = (value: string) => {
    setTaxPercentage(value)
    const numericValue = parseFloat(value)
    if (!isNaN(numericValue)) {
      handleInputChange("taxRate", numericValue / 100)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig)
      setTaxPercentage((originalConfig.taxRate * 100).toString())
      toast.success("Cambios revertidos")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setIsSaving(true)
    const saveToast = toast.loading("Guardando configuración...")

    try {
      const response = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast.success("Configuración actualizada correctamente", { id: saveToast })
        setOriginalConfig(config)
        setHasChanges(false)
      } else {
        toast.error("Error al actualizar la configuración", { id: saveToast })
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      toast.error("Error de conexión al guardar", { id: saveToast })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        {/* Fondo con gradientes dinámicos */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col">
          <ConfigHeader 
            hasChanges={hasChanges} 
            isSaving={isSaving} 
            onReset={handleReset} 
            onSubmit={handleSubmit} 
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {isLoading ? (
            <ConfigSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="empresa" className="w-full">
                  <TabsList className="flex w-full bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-2xl h-auto mb-8 shadow-sm">
                    <TabsTrigger 
                      value="empresa" 
                      className="flex-1 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Información Empresa
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sistema" 
                      className="flex-1 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Ajustes de Sistema
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="empresa" className="mt-0 outline-none">
                    <RestaurantInfoCard 
                      config={config} 
                      onChange={handleInputChange} 
                      formatPhone={formatPhoneNumber} 
                    />
                  </TabsContent>

                  <TabsContent value="sistema" className="mt-0 outline-none">
                    <SystemSettingsCard 
                      config={config} 
                      taxPercentage={taxPercentage}
                      onTaxChange={handleTaxChange}
                      onChange={handleInputChange}
                      timezones={timezones}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-6">
                <TicketPreview config={config} taxPercentage={taxPercentage} />
                <StatusIndicator hasChanges={hasChanges} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  </RoleGuard>
)
}
