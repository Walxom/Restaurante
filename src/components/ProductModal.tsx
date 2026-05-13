import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  X, 
  Package, 
  Layers, 
  UtensilsCrossed, 
  DollarSign, 
  ChefHat, 
  Plus, 
  Trash2, 
  Info,
  Save,
  ChevronRight,
  TrendingUp,
  Clock,
  History,
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCompatibleUnits, getUnitLabel } from "@/lib/units"
import { toast } from "react-hot-toast"
import { Product, Category, Ingredient, RecipeIngredient } from "@/types"

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  product: Product | null
  categories: Category[]
}

export default function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
  })
  const [recipeData, setRecipeData] = useState({
    hasRecipe: false,
    instructions: "",
    prepTime: "",
    servings: "",
    ingredients: [] as Array<{
      ingredientId: string
      quantity: number
      unit: string
    }>
  })
  
  const [ingredientSearch, setIngredientSearch] = useState("")
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar ingredientes disponibles
  useEffect(() => {
    if (isOpen) {
      fetchIngredients()
    }
  }, [isOpen])

  // Resetear formulario cuando cambia el producto o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || "",
          price: Number(product.price).toString(),
          categoryId: product.categoryId || "",
          isAvailable: product.isAvailable,
        })
        
        // Cargar datos de receta si existe
        if (product.recipe) {
          setRecipeData({
            hasRecipe: true,
            instructions: product.recipe.instructions || "",
            prepTime: product.recipe.prepTime?.toString() || "",
            servings: product.recipe.servings.toString(),
            ingredients: product.recipe.ingredients.map(ing => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit
            }))
          })
        }
      } else {
        setFormData({
          name: "",
          description: "",
          price: "",
          categoryId: categories.length > 0 ? categories[0].id : "",
          isAvailable: true,
        })
        setRecipeData({
          hasRecipe: false,
          instructions: "",
          prepTime: "",
          servings: "1",
          ingredients: []
        })
      }
      setErrors({})
    }
  }, [isOpen, product, categories])

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setAvailableIngredients(data.ingredients || [])
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    }
  }

  const addRecipeIngredient = () => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        ingredientId: "",
        quantity: 0,
        unit: ""
      }]
    }))
  }

  const removeRecipeIngredient = (index: number) => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setRecipeData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          // Si se está cambiando el ingrediente, también actualizar la unidad por defecto
          if (field === 'ingredientId') {
            const selectedIngredient = availableIngredients.find(ing => ing.id === value)
            return { 
              ...ingredient, 
              [field]: value,
              unit: selectedIngredient?.unit || ""
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a 0"
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "La categoría es requerida"
    }

    // Validaciones de receta
    if (recipeData.hasRecipe) {
      if (recipeData.prepTime && parseInt(recipeData.prepTime) < 0) {
        newErrors.prepTime = "El tiempo de preparación no puede ser negativo"
      }

      if (recipeData.ingredients.length === 0) {
        newErrors.ingredients = "Debe agregar al menos un ingrediente"
      }

      // Validar ingredientes de la receta
      recipeData.ingredients.forEach((ingredient, index) => {
        if (!ingredient.ingredientId) {
          newErrors[`ingredient_${index}_id`] = "Selecciona un ingrediente"
        }
        if (!ingredient.quantity || ingredient.quantity <= 0) {
          newErrors[`ingredient_${index}_quantity`] = "La cantidad debe ser mayor a 0"
        }
        if (!ingredient.unit.trim()) {
          newErrors[`ingredient_${index}_unit`] = "La unidad es requerida"
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Por favor, revisa los campos obligatorios")
      return
    }

    setIsLoading(true)
    
    try {
      const url = product 
        ? `/api/products/${product.id}` 
        : "/api/products"
      
      const method = product ? "PATCH" : "POST"
      
      const requestBody: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        isAvailable: formData.isAvailable,
      }

      if (recipeData.hasRecipe) {
        requestBody.recipe = {
          instructions: recipeData.instructions.trim() || null,
          prepTime: recipeData.prepTime ? parseInt(recipeData.prepTime) : null,
          servings: recipeData.servings ? parseInt(recipeData.servings) : 1,
          ingredients: recipeData.ingredients.map(ingredient => ({
            ingredientId: ingredient.ingredientId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: null
          }))
        }
      } else {
        // Si no tiene receta, enviar null para eliminar receta existente
        requestBody.recipe = null
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al guardar el producto" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return
    
    if (!confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al eliminar el producto" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] leading-none mb-1">{title}</h4>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 leading-none">{subtitle}</p>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-4xl bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 text-primary">
              {product ? <ChefHat className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">
                {product ? "Ficha de Producto" : "Nuevo Registro de Menú"}
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {product ? `Editando: ${product.name}` : "Configuración de oferta gastronómica"}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
          <div className="p-8 space-y-12">
            
            {/* SECCIÓN 1: IDENTIFICACIÓN */}
            <section>
              <SectionTitle icon={Layers} title="Identificación" subtitle="Información principal del producto" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Comercial</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    placeholder="EJ: HAMBURGUESA TRIPLE QUESO"
                    className={cn(
                      "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
                      errors.name && "border-rose-500/50 bg-rose-500/5"
                    )}
                  />
                  {errors.name && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Categoría de Menú</label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  >
                    <SelectTrigger className="h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest">
                      <SelectValue placeholder="SELECCIONAR CATEGORÍA" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-2xl">
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase tracking-widest">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.categoryId}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Precio de Venta (S/)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <Input
                      type="number" step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={cn(
                        "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl pl-10 pr-5 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
                        errors.price && "border-rose-500/50 bg-rose-500/5"
                      )}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.price}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Disponibilidad</label>
                  <div 
                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                    className={cn(
                      "h-12 rounded-2xl border flex items-center px-5 cursor-pointer transition-all gap-3",
                      formData.isAvailable 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-500"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      formData.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {formData.isAvailable ? "Producto Activo" : "Producto Agotado"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={UtensilsCrossed} title="Descripción" subtitle="Detalles para el cliente" />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Escribe una descripción sugerente del plato..."
                rows={3}
                className="w-full bg-foreground/[0.03] border border-border/50 rounded-2xl p-5 text-[11px] font-bold text-foreground placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
              />
            </section>

            {/* SECCIÓN 3: INGENIERÍA DE RECETA */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <SectionTitle icon={UtensilsCrossed} title="Ingeniería" subtitle="Configuración de costos y receta" />
                <div 
                  onClick={() => setRecipeData({ ...recipeData, hasRecipe: !recipeData.hasRecipe })}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-xl border cursor-pointer transition-all",
                    recipeData.hasRecipe 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-foreground/5 border-border/50 text-muted-foreground opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    recipeData.hasRecipe ? "bg-primary animate-pulse" : "bg-muted-foreground"
                  )} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {recipeData.hasRecipe ? "Receta Activada" : "Sin Receta"}
                  </span>
                </div>
              </div>

              {recipeData.hasRecipe && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between p-4 bg-foreground/[0.02] border border-border/50 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Ingredientes del Plato</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Los insumos se descontarán al vender</p>
                    </div>
                    <Button
                      type="button"
                      onClick={addRecipeIngredient}
                      className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Añadir Insumo
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Tiempo Prep. (Min)
                      </label>
                      <Input
                        type="number"
                        value={recipeData.prepTime}
                        onChange={(e) => setRecipeData({ ...recipeData, prepTime: e.target.value })}
                        className="h-10 bg-foreground/5 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                        placeholder="Ej: 15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                        <UtensilsCrossed className="w-2.5 h-2.5" /> Porciones
                      </label>
                      <Input
                        type="number"
                        value={recipeData.servings}
                        onChange={(e) => setRecipeData({ ...recipeData, servings: e.target.value })}
                        className="h-10 bg-foreground/5 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                        placeholder="Ej: 1"
                      />
                    </div>
                  </div>

                  {errors.ingredients && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest">
                      {errors.ingredients}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {recipeData.ingredients.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center text-muted-foreground/30">
                        <Package className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No hay ingredientes vinculados</p>
                      </div>
                    ) : (
                      recipeData.ingredients.map((item, index) => {
                        const selectedIng = availableIngredients.find(ing => ing.id === item.ingredientId)
                        const compatibleUnits = selectedIng ? getCompatibleUnits(selectedIng.unit) : []

                        return (
                          <div key={index} className="group relative bg-foreground/[0.02] hover:bg-foreground/[0.04] border border-border/50 rounded-2xl p-4 transition-all duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                              {/* Selección de Insumo */}
                              <div className="sm:col-span-6 space-y-1.5">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Insumo del Inventario</label>
                                <Select 
                                  value={item.ingredientId} 
                                  onValueChange={(v) => updateRecipeIngredient(index, 'ingredientId', v)}
                                >
                                  <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-bold uppercase tracking-widest">
                                    <SelectValue placeholder="BUSCAR INSUMO..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-xl max-h-[200px]">
                                    <div className="p-2 border-b border-border/50 sticky top-0 bg-popover z-10">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
                                        <Input
                                          placeholder="Filtrar..."
                                          value={ingredientSearch}
                                          onChange={(e) => setIngredientSearch(e.target.value)}
                                          className="h-8 pl-8 text-[10px] font-bold uppercase bg-foreground/5 border-none rounded-lg"
                                        />
                                      </div>
                                    </div>
                                    {availableIngredients
                                      .filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                                      .map(ing => (
                                        <SelectItem key={ing.id} value={ing.id} className="text-[9px] font-black uppercase tracking-widest">
                                          <div className="flex items-center justify-between w-full gap-4">
                                            <span>{ing.name}</span>
                                            <span className="text-[8px] opacity-40 italic">Stock: {ing.currentStock} {getUnitLabel(ing.unit, true)}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Cantidad */}
                              <div className="sm:col-span-3 space-y-1.5">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Cantidad</label>
                                <Input
                                  type="number" step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-black tracking-widest"
                                />
                              </div>

                              {/* Unidad */}
                              <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Unidad</label>
                                <Select 
                                  value={item.unit} 
                                  onValueChange={(v) => updateRecipeIngredient(index, 'unit', v)}
                                  disabled={!selectedIng}
                                >
                                  <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30">
                                    <SelectValue placeholder="---" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50 rounded-xl">
                                    {compatibleUnits.map(unit => (
                                      <SelectItem key={unit} value={unit} className="text-[9px] font-black uppercase tracking-widest">
                                        {getUnitLabel(unit, true)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Eliminar */}
                              <div className="sm:col-span-1 flex justify-end">
                                <Button
                                  type="button"
                                  onClick={() => removeRecipeIngredient(index)}
                                  variant="ghost"
                                  className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {errors[`ingredient_${index}_id`] && (
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">Falta seleccionar el insumo</p>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </section>

            {errors.submit && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Info className="w-4 h-4 text-rose-500" />
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errors.submit}</p>
              </div>
            )}
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-8 border-t border-border/50 bg-foreground/[0.02] flex gap-4">
          {product && (
            <Button
              type="button"
              onClick={handleDelete}
              variant="ghost"
              className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <div className="flex-1" />
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-foreground/5 transition-all"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl shadow-black/10 transition-all active:scale-95"
          >
            {isLoading ? "Procesando..." : (product ? "Guardar Cambios" : "Crear Producto")}
          </Button>
        </div>
      </div>
    </div>
  )
}
