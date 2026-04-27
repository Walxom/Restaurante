"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface TicketPreviewProps {
  config: any
  taxPercentage: string
}

export function TicketPreview({ config, taxPercentage }: TicketPreviewProps) {
  return (
    <Card className="border-gray-200 shadow-sm sticky top-24 overflow-hidden">
      <CardHeader className="bg-white border-b border-gray-100">
        <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Vista Previa Ticket</CardTitle>
      </CardHeader>
      <CardContent className="p-0 bg-gray-50/30">
        <div className="p-6 flex flex-col items-center">
          <div className="w-full bg-white p-4 shadow-sm border border-gray-100 rounded-sm space-y-4 font-mono text-[11px] text-gray-800">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm uppercase leading-tight">{config.companyName || "NOMBRE"}</h3>
              {config.companyRuc && <p>RUC: {config.companyRuc}</p>}
              {config.companyAddress && <p className="leading-tight max-w-[150px] mx-auto text-[10px]">{config.companyAddress}</p>}
              {config.companyPhone && <p>TEL: {config.companyPhone}</p>}
            </div>
            <div className="border-t border-dashed border-gray-300 py-2">
              <div className="flex justify-between"><span>BOLETA ELECTRÓNICA</span><span>B001-000452</span></div>
              <div className="flex justify-between"><span>FECHA:</span><span>{new Date().toLocaleDateString()}</span></div>
            </div>
            <div className="border-t border-dashed border-gray-300 py-2 space-y-1">
              <div className="flex justify-between"><span>1x Menú del Día</span><span>15.00</span></div>
              <div className="flex justify-between"><span>1x Gaseosa 500ml</span><span>3.50</span></div>
            </div>
            <div className="border-t-2 border-double border-gray-900 pt-2 space-y-1">
              <div className="flex justify-between text-gray-500"><span>SUBTOTAL</span><span>15.68</span></div>
              <div className="flex justify-between font-bold"><span>IGV ({taxPercentage}%)</span><span>2.82</span></div>
              <div className="flex justify-between text-sm pt-1 font-bold text-black"><span>TOTAL</span><span>{config.currency} 18.50</span></div>
            </div>
            <div className="text-center pt-2 text-[10px] italic text-gray-400 border-t border-dashed border-gray-200 mt-2">¡Gracias por su preferencia!</div>
          </div>
        </div>
      </CardContent>
      <div className="p-4 bg-blue-50/50 border-t border-blue-100 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-blue-700 leading-relaxed">
          Los datos que configures aquí se reflejarán automáticamente en todos tus comprobantes.
        </p>
      </div>
    </Card>
  )
}
