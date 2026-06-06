"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { type Category } from "@/types"
import { ModalShell } from "@/components/ui/modal-shell"
import { PremiumInput } from "@/components/ui/premium-input"
import { SectionTitle } from "@/components/ui/section-title"
import { Layers, Save, Trash2, Info } from "lucide-react"

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  category: Category | null
}

export default function CategoryModal({ isOpen, onClose, onSave, category }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resetear formulario cuando cambia la categoría o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name,
          description: category.description || "",
        })
      } else {
        setFormData({
          name: "",
          description: "",
        })
      }
      setErrors({})
    }
  }, [isOpen, category])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = category
        ? `/api/categories/${category.id}`
        : "/api/categories"

      const method = category ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al guardar la categoría" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return

    if (!confirm("¿Estás seguro de que quieres eliminar esta categoría? Esta acción no se puede deshacer.")) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
        onClose()
      } else {
        setErrors({ submit: data.error || "Error al eliminar la categoría" })
      }
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error de conexión" })
    } finally {
      setIsLoading(false)
    }
  }

  const modalFooter = (
    <div className="flex gap-4">
      {category && (
        <Button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          variant="ghost"
          className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-rose-500 hover:bg-rose-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </Button>
      )}
      <div className="flex-1"></div>
      <Button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        variant="ghost"
        className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-foreground/5 transition-all"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        onClick={handleSubmit}
        disabled={isLoading}
        className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl shadow-black/10 transition-all active:scale-95"
      >
        {isLoading ? "Guardando..." : category ? "Actualizar" : "Crear Categoría"}
      </Button>
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={category ? Save : Layers}
      title={category ? "Editar Categoría" : "Nueva Categoría de Menú"}
      subtitle={category ? `Editando: ${category.name}` : "Organiza tu oferta gastronómica"}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-12">
        <section>
          <SectionTitle icon={Layers} title="Detalles" subtitle="Información de la categoría" />
          <div className="space-y-6">
            <PremiumInput
              label="Nombre de Categoría"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Entradas, Platos Principales..."
              error={errors.name}
            />

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Descripción (Opcional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Escribe una breve descripción..."
                rows={3}
                className="w-full bg-foreground/[0.03] border border-border/50 rounded-2xl p-5 text-[11px] font-bold text-foreground placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {errors.submit && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Info className="w-4 h-4 text-rose-500" />
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errors.submit}</p>
          </div>
        )}
      </form>
    </ModalShell>
  )
}
