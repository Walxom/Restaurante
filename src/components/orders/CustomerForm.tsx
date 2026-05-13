import { Input } from "@/components/ui/input"
import { OrderType, CustomerData } from "@/types"

interface CustomerFormProps {
  orderType: OrderType
  customerData: CustomerData
  setCustomerData: (data: any) => void
}

export function CustomerForm({ orderType, customerData, setCustomerData }: CustomerFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
            Nombre Completo {orderType === 'MESA' ? '(Opcional)' : '*'}
          </label>
          <Input
            placeholder="Ej: Juan Pérez García"
            value={customerData.name}
            onChange={(e) => setCustomerData((prev: any) => ({ ...prev, name: e.target.value }))}
            className="h-12 bg-background/50 border-border/50 rounded-xl focus:ring-blue-500/20"
            required={orderType !== 'MESA'}
          />
        </div>
        {orderType === 'DELIVERY' && (
          <div className="space-y-2">
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
              Teléfono *
            </label>
            <Input
              placeholder="Ej: 987654321"
              value={customerData.phone}
              onChange={(e) => setCustomerData((prev: any) => ({ ...prev, phone: e.target.value }))}
              className="h-12 bg-background/50 border-border/50 rounded-xl"
              required
            />
          </div>
        )}
      </div>

      {orderType === 'DELIVERY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
          <div className="space-y-2">
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
              Dirección *
            </label>
            <Input
              placeholder="Ej: Av. Los Pinos 123"
              value={customerData.address}
              onChange={(e) => setCustomerData((prev: any) => ({ ...prev, address: e.target.value }))}
              className="h-12 bg-background/50 border-border/50 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
              Referencia
            </label>
            <Input
              placeholder="Ej: Portón azul, frente al parque"
              value={customerData.addressReference}
              onChange={(e) => setCustomerData((prev: any) => ({ ...prev, addressReference: e.target.value }))}
              className="h-12 bg-background/50 border-border/50 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
