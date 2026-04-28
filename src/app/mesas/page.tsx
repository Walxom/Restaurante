"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import TableModal from "@/components/TableModal"
import StatusChangeModal from "@/components/StatusChangeModal"
import { Plus, ArrowLeft, Users, Settings } from "lucide-react"

interface Table {
  id: string
  number: number
  capacity: number
  status: "DISPONIBLE" | "OCUPADA" | "FUERA_DE_SERVICIO" | "ESPERANDO"
  isActive: boolean
}

const statusColors = {
  DISPONIBLE: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  OCUPADA: "bg-red-50 border-red-200 hover:bg-red-100",
  FUERA_DE_SERVICIO: "bg-gray-50 border-gray-200 hover:bg-gray-100",
  ESPERANDO: "bg-amber-50 border-amber-200 hover:bg-amber-100",
}

const statusDotColors = {
  DISPONIBLE: "bg-emerald-500",
  OCUPADA: "bg-red-500",
  FUERA_DE_SERVICIO: "bg-gray-500",
  ESPERANDO: "bg-amber-500",
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando mesas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 sm:gap-4">
               <Button 
                 onClick={() => router.push("/dashboard")} 
                 variant="ghost"
                 size="sm"
                 className="text-gray-600 hover:text-gray-900"
               >
                 <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                 <span className="hidden sm:inline">Dashboard</span>
               </Button>
               <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
               <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Mesas</h1>
             </div>
             <Button 
               onClick={() => setShowCreateModal(true)}
               size="sm"
               className="bg-blue-600 hover:bg-blue-700 text-white"
             >
               <Plus className="w-4 h-4 mr-1 sm:mr-2" />
               <span className="hidden sm:inline">Nueva Mesa</span>
               <span className="sm:hidden">Nueva</span>
             </Button>
           </div>
         </div>
       </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Estadísticas minimalistas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{getStatusCount("DISPONIBLE")}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Disponibles</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{getStatusCount("OCUPADA")}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Ocupadas</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{getStatusCount("ESPERANDO")}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Esperando</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{getStatusCount("FUERA_DE_SERVICIO")}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Fuera de Servicio</p>
          </div>
        </div>

        {/* Filtros minimalistas */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 mr-2 hidden sm:inline">Filtrar:</span>
            <Button
              variant={filter === "ALL" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("ALL")}
              className="text-xs"
            >
              Todas
            </Button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(status)}
                className="text-xs"
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Vista de mesas como plano de restaurante */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 justify-center items-center min-h-[300px] sm:min-h-[400px]">
            {filteredTables.map((table) => (
              <div key={table.id} className="relative group">
                {/* Mesa visual */}
                <div 
                  className={`
                    ${getTableSize(table.capacity)} 
                    ${getTableShape(table.capacity)}
                    ${statusColors[table.status]}
                    border-2 cursor-pointer transition-all duration-200
                    flex flex-col items-center justify-center
                    shadow-sm hover:shadow-md
                    relative
                  `}
                  onClick={() => openStatusModal(table)}
                >
                  {/* Indicador de estado */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full ${statusDotColors[table.status]} border-2 border-white`}></div>
                  
                  {/* Número de mesa */}
                  <div className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                    {table.number}
                  </div>
                  
                  {/* Capacidad */}
                  <div className="flex items-center text-xs text-gray-600">
                    <Users className="w-3 h-3 mr-1" />
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
  )
}