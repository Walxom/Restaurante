"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface OrderPaginationProps {
  currentPage: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function OrderPagination({ currentPage, totalPages, onPrevious, onNext }: OrderPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <Button
        onClick={onPrevious}
        disabled={currentPage === 1}
        variant="ghost"
        size="sm"
        className="rounded-xl px-4 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Anterior
      </Button>

      <div className="flex items-center gap-2 px-4 py-2 bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
        <span className="text-sm font-bold text-foreground">{currentPage}</span>
        <span className="text-xs text-muted-foreground">de</span>
        <span className="text-sm font-bold text-muted-foreground">{totalPages}</span>
      </div>

      <Button
        onClick={onNext}
        disabled={currentPage === totalPages}
        variant="ghost"
        size="sm"
        className="rounded-xl px-4 text-muted-foreground hover:text-foreground"
      >
        Siguiente
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}
