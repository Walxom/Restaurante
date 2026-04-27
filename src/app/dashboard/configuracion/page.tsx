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
} from "@/lib/system-config"

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
      <div className="min-h-screen bg-gray-50/50">
        <ConfigHeader 
          hasChanges={hasChanges} 
          isSaving={isSaving} 
          onReset={handleReset} 
          onSubmit={handleSubmit} 
        />

        <main className="max-w-5xl mx-auto px-4 py-8">
          {isLoading ? (
            <ConfigSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Tabs defaultValue="empresa" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border border-gray-200 p-1 rounded-xl h-12">
                    <TabsTrigger value="empresa" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">
                      <Building2 className="w-4 h-4 mr-2" />
                      Información Empresa
                    </TabsTrigger>
                    <TabsTrigger value="sistema" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">
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
    </RoleGuard>
  )
}
