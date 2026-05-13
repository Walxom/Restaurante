"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import TableModal from "@/components/TableModal"
import StatusChangeModal from "@/components/StatusChangeModal"
import { AdminPageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"
import { Plus, Users, Settings } from "lucide-react"

interface Table {
  id: string
  number: number
  capacity: number
  status: "DISPONIBLE" | "OCUPADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"
  isActive: boolean
}

const statusColors = {
  DISPONIBLE: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-emerald-500/5",
  OCUPADA: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-700 dark:text-red-400 shadow-red-500/5",
  FUERA_DE_SERVICIO: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20 text-slate-700 dark:text-slate-400 shadow-slate-500/5",
  ESPERANDO: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-amber-500/5",
}

const statusDotColors = {
  DISPONIBLE: "bg-emerald-500 shadow-lg shadow-emerald-500/50",
  OCUPADA: "bg-red-500 shadow-lg shadow-red-500/50",
  FUERA_DE_SERVICIO: "bg-slate-500 shadow-lg shadow-slate-500/50",
  ESPERANDO: "bg-amber-500 shadow-lg shadow-amber-500/50",
}

const statusLabels = {
  DISPONIBLE: "Disponible",
  OCUPADA: "Ocupada",
  FUERA_DE_SERVICIO: "Fuera de Servicio",
  ESPERANDO: "Esperando",
}

export default function MesasPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [filter, setFilter] = useState<string>("ALL")

  // Verificar permisos
  useEffect(() => {
    if (session && session.user.role !== "JEFE") {
      router.push("/mesero")
    }
  }, [session, router])

  // Cargar mesas
  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data)
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleModalSave = () => {
    fetchTables()
  }

  const openEditModal = (table: Table) => {
    setEditingTable(table)
  }

  const openStatusModal = (table: Table) => {
    setSelectedTable(table)
    setShowStatusModal(true)
  }

  const filteredTables = filter === "ALL" 
    ? tables 
    : tables.filter(table => table.status === filter)

  const getStatusCount = (status: Table["status"]) => {
    return tables.filter(table => table.status === status).length
  }

  const getTableShape = (capacity: number) => {
    if (capacity <= 2) return "rounded-full"
    if (capacity <= 4) return "rounded-xl"
    return "rounded-2xl"
  }

  const getTableSize = (capacity: number) => {
    if (capacity <= 2) return "w-16 h-16 sm:w-20 sm:h-20"
    if (capacity <= 4) return "w-20 h-20 sm:w-24 sm:h-24"
    if (capacity <= 6) return "w-24 h-24 sm:w-28 sm:h-28"
    return "w-28 h-28 sm:w-32 sm:h-32"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-600/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Organizando el plano...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950 pointer-events-none" />
      <div className="relative z-10 flex flex-col">
      {/* Header minimalista */}
      <AdminPageHeader
        title="Gestión de Mesas"
        backTo="/dashboard"
      >
        <Button 
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Nueva Mesa</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </AdminPageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Estadísticas minimalistas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {[
            { label: 'Disponibles', count: getStatusCount("DISPONIBLE"), color: 'bg-emerald-500' },
            { label: 'Ocupadas', count: getStatusCount("OCUPADA"), color: 'bg-red-500' },
            { label: 'Esperando', count: getStatusCount("ESPERANDO"), color: 'bg-amber-500' },
            { label: 'Inactivas', count: getStatusCount("FUERA_DE_SERVICIO"), color: 'bg-slate-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-3 mb-1">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", stat.color)}></div>
                <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{stat.count}</span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros minimalistas */}
        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-4">Filtro:</span>
            <Button
              variant={filter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("ALL")}
              className={cn(
                "rounded-full text-xs px-5 h-9 transition-all duration-300",
                filter === "ALL" ? "shadow-lg shadow-primary/20" : "bg-card/40 border-border/50 text-muted-foreground hover:bg-accent"
              )}
            >
              Todas las Mesas
            </Button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className={cn(
                  "rounded-full text-xs px-5 h-9 transition-all duration-300",
                  filter === status ? "shadow-lg shadow-primary/20" : "bg-card/40 border-border/50 text-muted-foreground hover:bg-accent"
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Vista de mesas como plano de restaurante */}
        <div className="bg-card/30 backdrop-blur-md rounded-3xl p-6 sm:p-10 shadow-xl border border-border/50">
          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 justify-center items-center min-h-[300px] sm:min-h-[400px]">
            {filteredTables.map((table) => (
              <div key={table.id} className="relative group">
                {/* Mesa visual */}
                <div 
                  className={`
                    ${getTableSize(table.capacity)} 
                    ${getTableShape(table.capacity)}
                    ${statusColors[table.status]}
                    border-2 cursor-pointer transition-all duration-500
                    flex flex-col items-center justify-center
                    relative group-hover:scale-110 active:scale-95
                  `}
                  onClick={() => openStatusModal(table)}
                >
                  {/* Indicador de estado */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full ${statusDotColors[table.status]} border-2 border-background`}></div>
                  
                  {/* Número de mesa */}
                  <div className="text-xl sm:text-2xl font-black tracking-tighter">
                    {table.number}
                  </div>
                  
                  {/* Capacidad */}
                  <div className="flex items-center text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                    <Users className="w-2.5 h-2.5 mr-1" />
                    {table.capacity}
                  </div>
                </div>

                {/* Botón de edición (aparece al hover en desktop, siempre visible en móvil) */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditModal(table)
                  }}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              </div>
            ))}
          </div>

          {filteredTables.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto mb-4" />
              </div>
              <p className="text-gray-500 mb-4">
                {filter === "ALL" 
                  ? "No hay mesas configuradas" 
                  : `No hay mesas ${statusLabels[filter as keyof typeof statusLabels].toLowerCase()}`
                }
              </p>
              {filter === "ALL" && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Mesa
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modales */}
      <TableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleModalSave}
        table={null}
      />

      <TableModal
        isOpen={!!editingTable}
        onClose={() => setEditingTable(null)}
        onSave={handleModalSave}
        table={editingTable}
      />

      <StatusChangeModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSave={handleModalSave}
        table={selectedTable}
      />
    </div>
    </div>
  )
}