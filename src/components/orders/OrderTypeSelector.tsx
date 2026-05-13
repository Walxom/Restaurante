import { Utensils, Package, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { OrderType, Table } from "@/types"

interface OrderTypeSelectorProps {
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  setSelectedTable: (table: any) => void
}

export function OrderTypeSelector({ orderType, setOrderType, setSelectedTable }: OrderTypeSelectorProps) {
  const types = [
    { id: 'MESA', label: 'En Mesa', icon: Utensils, color: 'blue' },
    { id: 'PARA_LLEVAR', label: 'Llevar', icon: Package, color: 'amber' },
    { id: 'DELIVERY', label: 'Delivery', icon: Truck, color: 'emerald' },
  ] as const

  return (
    <div>
      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
        Tipo de Pedido
      </label>
      <div className="grid grid-cols-3 gap-4">
        {types.map((type) => {
          const Icon = type.icon
          const isActive = orderType === type.id
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setOrderType(type.id as OrderType)
                setSelectedTable(null)
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 active:scale-95 group",
                isActive 
                  ? `bg-${type.color}-500/10 border-${type.color}-500 shadow-lg shadow-${type.color}-500/10` 
                  : "bg-background/40 border-border/50 hover:border-border text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isActive ? `bg-${type.color}-500 text-white` : "bg-muted group-hover:bg-muted/80"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn("text-xs font-bold uppercase tracking-wider", isActive ? "text-foreground" : "")}>
                {type.label}
              </span>
              {isActive && (
                <div className={cn(`absolute -top-1 -right-1 w-4 h-4 bg-${type.color}-500 rounded-full border-2 border-background flex items-center justify-center`)}>
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
