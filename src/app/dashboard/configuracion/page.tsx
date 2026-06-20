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

// Utils, Config y Validación
import {
  getSupportedTimezones,
  type SystemConfigData as SystemConfig
} from "@/features/dashboard/utils/system-config-client"
import { systemConfigSchema } from "@/features/dashboard/validations/system-config"

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
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleInputChange = (field: keyof SystemConfig, value: string | number | null) => {
    if (!config) return
    setConfig(prev => prev ? ({ ...prev, [field]: value }) : null)
    
    // Limpiar error activo del campo editado de forma proactiva
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  const handleTaxChange = (value: string) => {
    setTaxPercentage(value)
    
    // Limpiar error de tasa de impuesto de forma proactiva
    if (errors.taxRate) {
      setErrors(prev => {
        const updated = { ...prev }
        delete updated.taxRate
        return updated
      })
    }

    const numericValue = parseFloat(value)
    if (!isNaN(numericValue)) {
      handleInputChange("taxRate", numericValue / 100)
    } else {
      handleInputChange("taxRate", 0)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig)
      setTaxPercentage((originalConfig.taxRate * 100).toString())
      setErrors({})
      toast.success("Cambios revertidos")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    // Validar formulario localmente con Zod
    const validationResult = systemConfigSchema.safeParse({
      ...config,
      taxRate: parseFloat(taxPercentage) / 100
    })

    if (!validationResult.success) {
      const validationErrors: Record<string, string> = {}
      validationResult.error.issues.forEach(err => {
        if (err.path[0]) {
          validationErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(validationErrors)
      toast.error("Corrige los campos marcados en rojo")
      return
    }

    setErrors({})
    setIsSaving(true)
    const saveToast = toast.loading("Guardando configuración...")

    try {
      const response = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
      })

      if (response.ok) {
        toast.success("Configuración actualizada correctamente", { id: saveToast })
        const updatedData = await response.json()
        setConfig(updatedData)
        setOriginalConfig(updatedData)
        setTaxPercentage((updatedData.taxRate * 100).toString())
        setHasChanges(false)
      } else {
        const errResponse = await response.json()
        toast.error(errResponse.error || "Error al actualizar la configuración", { id: saveToast })
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
                        className="flex-1 py-2.5 sm:py-3 rounded-xl font-black uppercase tracking-[0.05em] sm:tracking-[0.15em] text-[9px] sm:text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20"
                      >
                        <Building2 className="hidden sm:inline w-4 h-4 mr-2" />
                        Empresa
                      </TabsTrigger>
                      <TabsTrigger 
                        value="sistema" 
                        className="flex-1 py-2.5 sm:py-3 rounded-xl font-black uppercase tracking-[0.05em] sm:tracking-[0.15em] text-[9px] sm:text-[10px] transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20"
                      >
                        <Settings className="hidden sm:inline w-4 h-4 mr-2" />
                        Sistema
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="empresa" className="mt-0 outline-none">
                      <RestaurantInfoCard 
                        config={config} 
                        onChange={handleInputChange} 
                        formatPhone={formatPhoneNumber} 
                        errors={errors}
                        isSaving={isSaving}
                      />
                    </TabsContent>

                    <TabsContent value="sistema" className="mt-0 outline-none">
                      <SystemSettingsCard 
                        config={config} 
                        taxPercentage={taxPercentage}
                        onTaxChange={handleTaxChange}
                        onChange={handleInputChange}
                        timezones={timezones}
                        errors={errors}
                        isSaving={isSaving}
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
