"use client"

import { Button } from "@/components/ui/button"
import { Package, Edit, Trash2 } from "lucide-react"
import { type Product } from "@/types"

interface Props {
  products: Product[]
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
}

export default function ProductTable({ products, onEdit, onDelete }: Props) {
  if (!products || products.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase">Sin productos</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-card border-b border-border/50">
        <tr>
          <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Producto</th>
          <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Categoría</th>
          <th className="text-right p-4 font-black text-[10px] uppercase tracking-widest">Precio</th>
          <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Estado</th>
          <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {products.map((product) => (
          <tr key={product.id} className="hover:bg-background/50 transition-colors">
            <td className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600/90 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{product.description || '-'}</p>
                </div>
              </div>
            </td>
            <td className="p-4 text-sm">{product.category?.name}</td>
            <td className="p-4 text-right font-semibold">S/ {product.price}</td>
            <td className="p-4 text-center">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.isActive && product.isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
                }`}>
                {product.isActive && product.isAvailable ? 'DISPONIBLE' : 'INACTIVO'}
              </span>
            </td>
            <td className="p-4">
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(product)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
