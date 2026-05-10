import { Clock, CheckCircle, XCircle, AlertCircle, PlayCircle, CheckCircle2, ShoppingBag, Truck } from "lucide-react"

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5'
    case 'CONFIRMED': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/5'
    case 'PREPARING': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 shadow-sm shadow-orange-500/5'
    case 'READY': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5'
    case 'SERVED': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5'
    case 'COMPLETED': return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20 shadow-sm shadow-slate-500/5'
    case 'CANCELLED': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 shadow-sm shadow-red-500/5'
    default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Pendiente'
    case 'CONFIRMED': return 'Confirmado'
    case 'PREPARING': return 'En Preparación'
    case 'READY': return 'Listo'
    case 'SERVED': return 'Servido'
    case 'COMPLETED': return 'Completado'
    case 'CANCELLED': return 'Cancelado'
    default: return status
  }
}

export const getOrderTypeInfo = (type: string, tableNumber?: number) => {
  switch (type) {
    case 'MESA': return { label: `Mesa ${tableNumber}`, icon: '🪑' }
    case 'DELIVERY': return { label: 'Delivery', icon: '🚚' }
    case 'PARA_LLEVAR': return { label: 'Para llevar', icon: '🥡' }
    default: return { label: type, icon: '📦' }
  }
}
