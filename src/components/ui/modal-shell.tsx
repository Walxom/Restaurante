"use client"

import { type ReactNode } from "react"
import { X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  icon: LucideIcon
  title: string
  subtitle: string
  footer?: ReactNode
  children: ReactNode
  maxWidth?: string // "max-w-2xl" | "max-w-4xl" | etc.
}

export function ModalShell({
  isOpen,
  onClose,
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
  maxWidth = "max-w-2xl"
}: ModalShellProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      {/* MODAL CONTAINER */}
      <div className={cn(
        "relative w-full bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]",
        maxWidth
      )}>
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 text-primary">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">
                {title}
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {subtitle}
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

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8">
            {children}
          </div>
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="p-8 border-t border-border/50 bg-foreground/[0.02]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
