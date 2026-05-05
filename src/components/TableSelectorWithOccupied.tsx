"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Plus, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface Table {
  id: string
  number: number
  capacity: number
  status: string
}

interface TableSelectorWithOccupiedProps {
  tables: Table[]
  selectedTable: Table | null
  onSelectTable: (table: Table) => void
  showOccupied?: boolean
}

export default function TableSelectorWithOccupied({ 
  tables, 
  selectedTable, 
  onSelectTable,
  showOccupied = false 
}: TableSelectorWithOccupiedProps) {
  const router = useRouter()

  const availableTables = tables.filter(table => table.status === 'DISPONIBLE')
  const occupiedTables = tables.filter(table => table.status === 'OCUPADA' || table.status === 'ESPERANDO')

  const handleAdditionalOrder = async (table: Table) => {
    try {
      // Buscar todos los pedidos de la mesa que no estén cancelados o completados
      const response = await fetch(`/api/orders?tableId=${table.id}`)
      if (response.ok) {
        const allOrders = await response.json()
        // Filtrar pedidos que no estén cancelados o completados
        const activeOrders = allOrders.filter((order: any) => 
          !['CANCELLED', 'COMPLETED'].includes(order.status)
        )
        
        if (activeOrders.length > 0) {
          // Redirigir al primer pedido activo para ver detalles
          router.push(`/pedidos/${activeOrders[0].id}/detalles`)
        } else {
          // Si no hay pedidos activos, crear uno nuevo
          router.push('/pedidos/nuevo')
        }
      }
    } catch (error) {
      console.error('Error al buscar pedidos de la mesa:', error)
      router.push('/pedidos/nuevo')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return 'bg-green-100 text-green-800'
      case 'ESPERANDO':
        return 'bg-yellow-100 text-yellow-800'
      case 'OCUPADA':
        return 'bg-red-100 text-red-800'
      case 'FUERA_DE_SERVICIO':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return 'Disponible'
      case 'ESPERANDO':
        return 'Esperando'
      case 'OCUPADA':
        return 'Ocupada'
      case 'FUERA_DE_SERVICIO':
        return 'Fuera de servicio'
      default:
        return status
    }
  }

  if (availableTables.length === 0 && occupiedTables.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">No hay mesas disponibles</p>
        <p className="text-gray-400 text-sm mt-2">
          Todas las mesas están fuera de servicio
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mesas Disponibles */}
      {availableTables.length > 0 && (
        <div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {availableTables.map((table) => (
              <button
                key={table.id}
                className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                  selectedTable?.id === table.id
                    ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200"
                    : "hover:bg-gray-50 border-gray-200"
                }`}
                onClick={() => onSelectTable(table)}
              >
                <div className="text-lg font-semibold text-gray-900">
                  {table.number}
                </div>
                <div className="text-xs text-gray-500">
                  {table.capacity}p
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mesas Ocupadas */}
      {showOccupied && occupiedTables.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-red-600" />
            Mesas con Pedidos Activos ({occupiedTables.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {occupiedTables.map((table) => (
              <Card
                key={table.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 border-red-200"
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {table.number}
                  </div>
                  <div className="text-sm text-gray-600">
                    {table.capacity} {table.capacity === 1 ? "persona" : "personas"}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                      {getStatusText(table.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdditionalOrder(table)}
                    className="mt-3 w-full bg-orange-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ver Pedidos
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay mesas disponibles */}
      {availableTables.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No hay mesas disponibles</p>
          <p className="text-gray-400 text-sm mt-2">
            {occupiedTables.length > 0 
              ? "Puede crear pedidos adicionales en las mesas ocupadas"
              : "Todas las mesas están ocupadas o fuera de servicio"
            }
          </p>
        </div>
      )}
    </div>
  )
}