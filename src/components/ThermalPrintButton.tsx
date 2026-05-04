"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Printer, 
  FileText, 
  Receipt, 
  Server, 
  Settings,
  ChevronDown,
  Users,
  AlertCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import { FiscalReceiptPreview } from "@/components/FiscalReceiptPreview"
import { KitchenTicketPreview } from "@/components/KitchenTicketPreview"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  startDate?: string
  endDate?: string
  notes?: string
  customerName?: string
  customerDni?: string
  customerPhone?: string
  table?: {
    number: number
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string
    status: string
    product: {
      name: string
    }
  }>
  user: {
    name: string
  }
  invoice?: {
    id: string
    type: 'BOLETA' | 'FACTURA'
    number: string
  }
}

interface QueueStatus {
  length: number
  processing: number
  completed: number
  failed: number
  estimatedWaitTime: number
  printerStatus: 'disconnected' | 'connected' | 'busy' | 'error'
}

interface ThermalPrintButtonProps {
  order: Order
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary"
  compact?: boolean
  currentUser?: {
    id: string
    name: string
    role: string
  }
}

export default function ThermalPrintButton({ order, size = "sm", variant = "outline", compact = false, currentUser }: ThermalPrintButtonProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)

  useEffect(() => {
    // Cargar estado inicial de la cola
    fetchQueueStatus()
  }, [])

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/thermal-print/monitor?action=status')
      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data.data)
      }
    } catch (error) {
      console.error('Error al obtener estado de la cola:', error)
    }
  }

  // Solo mostrar para pedidos completados
  if (order.status !== 'COMPLETED') {
    return null
  }

  if (!currentUser) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50">
        <Users className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Sin Usuario</span>
      </Button>
    )
  }

  const getStatusIcon = () => {
    if (queueStatus) {
      switch (queueStatus.printerStatus) {
        case 'connected':
          return <Server className="h-3 w-3 text-green-500" />
        case 'busy':
          return <Server className="h-3 w-3 text-yellow-500 animate-pulse" />
        case 'error':
          return <AlertCircle className="h-3 w-3 text-red-500" />
        default:
          return <Server className="h-3 w-3 text-gray-400" />
      }
    }
    
    return <Server className="h-3 w-3 text-gray-400" />
  }

  const getStatusText = () => {
    if (queueStatus) {
      switch (queueStatus.printerStatus) {
        case 'connected':
          return `Cola: ${queueStatus.length}`
        case 'busy':
          return 'Imprimiendo...'
        case 'error':
          return 'Error'
        default:
          return 'Desconectada'
      }
    }
    return 'Verificando...'
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size="sm"
            className="h-7 px-2 text-xs relative"
          >
            <div className="flex items-center">
              <Printer className="h-3 w-3" />
              <ChevronDown className="h-2 w-2 ml-1" />
            </div>
            {/* Indicador de estado */}
            <div className="absolute -top-1 -right-1">
              {getStatusIcon()}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
            <div className="flex items-center justify-between">
              <span>Sistema de Impresión</span>
              <Badge variant={queueStatus?.printerStatus === 'connected' ? "default" : "secondary"} className="text-xs">
                {getStatusText()}
              </Badge>
            </div>
            {queueStatus && queueStatus.length > 0 && (
              <div className="text-xs text-orange-500 mt-1">
                {queueStatus.length} trabajos en cola
              </div>
            )}
          </div>
          
          <DropdownMenuItem asChild>
            <FiscalReceiptPreview
              orderId={order.id}
              documentType={order.invoice?.type || 'BOLETA'}
              customerName={order.customerName}
              customerRuc={order.customerDni}
              trigger={
                <div className="flex items-center cursor-pointer">
                  <Receipt className="h-4 w-4 mr-2" />
                  Vista Previa {order.invoice?.type || 'BOLETA'}
                </div>
              }
              onPrintSuccess={() => {
                toast.success(`${order.invoice?.type || 'BOLETA'} impresa exitosamente`)
                setTimeout(() => window.location.reload(), 1500)
              }}
              onPrintError={(error) => {
                toast.error(error)
              }}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="relative"
        >
          <>
            {order.invoice ? (
              order.invoice.type === 'BOLETA' ? (
                <Receipt className="h-4 w-4 mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            <span>
              Vista Previa {order.invoice?.type || 'BOLETA'}
            </span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </>
          
          {/* Indicador de estado */}
          <div className="absolute -top-1 -right-1">
            {getStatusIcon()}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Sistema de Impresión</span>
            <Badge variant={queueStatus?.printerStatus === 'connected' ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            Vista Previa • Ahorro de Papel
            {queueStatus && (
              <div className="mt-1 space-y-1">
                {queueStatus.length > 0 && (
                  <div className="text-orange-500">
                    Cola: {queueStatus.length} trabajos
                  </div>
                )}
                {queueStatus.estimatedWaitTime > 0 && (
                  <div className="text-blue-500">
                    Tiempo estimado: {Math.round(queueStatus.estimatedWaitTime / 1000)}s
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Vista previa de Boleta/Factura Fiscal */}
        <DropdownMenuItem asChild>
          <FiscalReceiptPreview
            orderId={order.id}
            documentType={order.invoice?.type || 'BOLETA'}
            customerName={order.customerName}
            customerRuc={order.customerDni}
            trigger={
              <div className="flex items-center w-full py-3 cursor-pointer">
                <Receipt className="h-5 w-5 mr-3 text-blue-500" />
                <div>
                  <div className="font-medium">
                    Vista Previa {order.invoice?.type || 'BOLETA'}
                  </div>
                  <div className="text-xs text-gray-500">Comprobante fiscal (sin imprimir)</div>
                </div>
              </div>
            }
            onPrintSuccess={() => {
              toast.success(`${order.invoice?.type || 'BOLETA'} impresa exitosamente`)
              setTimeout(() => window.location.reload(), 1500)
            }}
            onPrintError={(error) => {
              toast.error(error)
            }}
          />
        </DropdownMenuItem>

        {/* Vista previa de Ticket de Cocina */}
        <DropdownMenuItem asChild>
          <KitchenTicketPreview
            orderId={order.id}
            trigger={
              <div className="flex items-center w-full py-3 cursor-pointer">
                <FileText className="h-5 w-5 mr-3 text-green-500" />
                <div>
                  <div className="font-medium">Vista Previa Cocina</div>
                  <div className="text-xs text-gray-500">Ver formato + verificar conectividad (sin imprimir)</div>
                </div>
              </div>
            }
            onPrintSuccess={() => {
              toast.success('Ticket de cocina impreso exitosamente')
            }}
            onPrintError={(error) => {
              toast.error(error)
            }}
          />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={fetchQueueStatus} className="py-2">
          <Settings className="h-4 w-4 mr-2" />
          <span className="text-sm">Actualizar Estado</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}