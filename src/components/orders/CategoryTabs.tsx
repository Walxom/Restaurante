import { cn } from "@/lib/utils"
import { Category } from "@/types/orders"

interface CategoryTabsProps {
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: (id: string) => void
}

export function CategoryTabs({ categories, selectedCategory, setSelectedCategory }: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
            selectedCategory === category.id 
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" 
              : "bg-background/50 text-muted-foreground border border-border/50 hover:bg-accent"
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
