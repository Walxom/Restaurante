"use client"

import { AlertCircle, Package, Truck, Utensils } from "lucide-react"

interface CartContextInfoProps {
  orderType: 'MESA' | 'PARA_LLEVAR' | 'DELIVERY'
  selectedTable: { number: number; capacity: number } | null
}

export function CartContextInfo({ orderType, selectedTable }: CartContextInfoProps) {
  return (
    <div className="animate-in fade-in slide-in-from-top duration-500">
      {orderType === 'MESA' && (
        selectedTable ? (
          <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-blue-500 text-sm uppercase tracking-wider">Mesa {selectedTable.number}</div>
              <div className="text-[11px] text-blue-500/70 font-bold uppercase tracking-tight">
                CAPACIDAD: {selectedTable.capacity} PERSONAS
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-amber-600 text-sm uppercase tracking-wider">Mesa no seleccionada</div>
              <div className="text-[10px] text-amber-600/70 font-bold uppercase tracking-tight">
                POR FAVOR, SELECCIONA UNA MESA
              </div>
            </div>
          </div>
        )
      )}

      {orderType === 'PARA_LLEVAR' && (
        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-amber-600 text-sm uppercase tracking-wider">Para Llevar</div>
            <div className="text-[10px] text-amber-600/70 font-bold uppercase tracking-tight">
              RECOJO EN MOSTRADOR
            </div>
          </div>
        </div>
      )}

      {orderType === 'DELIVERY' && (
        <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-indigo-500 text-sm uppercase tracking-wider">Delivery</div>
            <div className="text-[10px] text-indigo-500/70 font-bold uppercase tracking-tight">
              ENVÍO A DOMICILIO
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
