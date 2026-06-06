"use client"

import { Button } from "@/components/ui/button"
import { Package, Edit, Trash2 } from "lucide-react"
import { type Category } from "@/types"

interface Props {
  categories: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}

export default function CategoryTable({ categories, onEdit, onDelete }: Props) {
  if (!categories || categories.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase">Sin categorías</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-card border-b border-border/50">
        <tr>
          <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Categoría</th>
          <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest">Descripción</th>
          <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Productos</th>
          <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Estado</th>
          <th className="text-center p-4 font-black text-[10px] uppercase tracking-widest">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {categories.map((category) => (
          <tr key={category.id} className="hover:bg-background/50 transition-colors">
            <td className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600/90 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold">{category.name}</span>
              </div>
            </td>
            <td className="p-4 text-muted-foreground text-sm">{category.description || '-'}</td>
            <td className="p-4 text-center font-semibold">{category.productCount}</td>
            <td className="p-4 text-center">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${category.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                {category.isActive ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </td>
            <td className="p-4">
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(category)}>
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
