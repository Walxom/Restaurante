import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  X, 
  ChefHat, 
  Plus, 
  Trash2, 
  Info,
  UtensilsCrossed
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { Product, Category, Ingredient, RecipeIngredient } from "@/types"
import { ProductIdentificationSection } from "./products/ProductIdentificationSection"
import { RecipeIngredientSection } from "./products/RecipeIngredientSection"

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
            <ProductIdentificationSection
              name={formData.name}
              onUpdateName={(v) => setFormData({ ...formData, name: v })}
              categoryId={formData.categoryId}
              onUpdateCategory={(v) => setFormData({ ...formData, categoryId: v })}
              categories={categories}
              price={formData.price}
              onUpdatePrice={(v) => setFormData({ ...formData, price: v })}
              isAvailable={formData.isAvailable}
              onToggleAvailability={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
              errors={errors}
            />

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
            <RecipeIngredientSection
              hasRecipe={recipeData.hasRecipe}
              onToggleRecipe={() => setRecipeData({ ...recipeData, hasRecipe: !recipeData.hasRecipe })}
              prepTime={recipeData.prepTime}
              onUpdatePrepTime={(v) => setRecipeData({ ...recipeData, prepTime: v })}
              servings={recipeData.servings}
              onUpdateServings={(v) => setRecipeData({ ...recipeData, servings: v })}
              recipeIngredients={recipeData.ingredients}
              availableIngredients={availableIngredients}
              onAddIngredient={addRecipeIngredient}
              onRemoveIngredient={removeRecipeIngredient}
              onUpdateIngredient={updateRecipeIngredient}
              errors={errors}
            />

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
