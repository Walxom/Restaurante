"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, ShoppingCart, Tag } from "lucide-react"
import { Product } from "@/types"
import { cn } from "@/lib/utils"

interface EditOrderCatalogProps {
  products: Product[]
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  onAddProduct: (product: Product) => void
}

export function EditOrderCatalog({
  products,
  selectedCategory,
  setSelectedCategory,
  onAddProduct
}: EditOrderCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Obtener categorías únicas
  const categories = Array.from(
    new Set(products.map(product => product.category?.name).filter(Boolean))
  ) as string[]

  // Filtrar productos según la categoría y búsqueda
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category?.name === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Agrupar productos filtrados por categoría
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = product.category?.name || "Sin Categoría"
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  return (
    <div className="space-y-6">
      {/* Filtros y Búsqueda */}
      <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xl shadow-shadow/5">
        <h2 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Filtrar Catálogo
        </h2>
        
        <div className="flex flex-col gap-4">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar platillo o bebida..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/60 focus-visible:ring-primary/50 rounded-2xl text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Categorías
              </label>
              {(selectedCategory !== "all" || searchQuery !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all")
                    setSearchQuery("")
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 border",
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-background/40 text-muted-foreground border-border/50 hover:bg-primary/10 hover:text-primary"
                )}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 border",
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-background/40 text-muted-foreground border-border/50 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      {Object.entries(productsByCategory).length === 0 ? (
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-shadow/5">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-25 animate-pulse" />
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-1">
            No se encontraron productos
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedCategory === "all" && searchQuery === ""
              ? "No hay productos disponibles en este momento."
              : "Prueba modificando la categoría seleccionada o los términos de búsqueda."
            }
          </p>
          {(selectedCategory !== "all" || searchQuery !== "") && (
            <Button
              onClick={() => {
                setSelectedCategory("all")
                setSearchQuery("")
              }}
              variant="outline"
              className="mt-5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 text-primary border-primary/20"
            >
              Ver todo el catálogo
            </Button>
          )}
        </div>
      ) : (
        Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <div
            key={category}
            className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xl shadow-shadow/5 space-y-4"
          >
            <div className="border-b border-border/40 pb-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest">
                {category}
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Selecciona productos para agregar a la comanda
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 border border-border/40 bg-card/10 backdrop-blur-sm rounded-2xl hover:border-primary/45 hover:bg-primary/[0.02] cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md hover:shadow-primary/5 flex flex-col justify-between gap-3 h-full"
                  onClick={() => onAddProduct(product)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1 gap-2">
                    <span className="text-xs sm:text-sm font-black text-emerald-500">
                      S/ {Number(product.price).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[9px] uppercase tracking-widest h-8 px-3.5 rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
