"use client"

import { type LucideIcon, RefreshCw, AlertCircle, Inbox } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface StateFeedbackProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'empty' | 'error' | 'info'
  className?: string
  isLoading?: boolean
}

export function StateFeedback({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'empty',
  className,
  isLoading = false
}: StateFeedbackProps) {
  
  const variants = {
    empty: {
      defaultIcon: Inbox,
      iconClassName: "bg-muted/50 text-muted-foreground/40",
      containerClassName: "border-dashed border-border/50 bg-background/50"
    },
    error: {
      defaultIcon: AlertCircle,
      iconClassName: "bg-rose-500/10 text-rose-500",
      containerClassName: "border-rose-500/20 bg-rose-500/5"
    },
    info: {
      defaultIcon: Inbox,
      iconClassName: "bg-blue-500/10 text-blue-500",
      containerClassName: "border-blue-500/20 bg-blue-500/5"
    }
  }

  const currentVariant = variants[variant]
  const DisplayIcon = Icon || currentVariant.defaultIcon

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-12 rounded-[2.5rem] border animate-in fade-in zoom-in duration-500",
      currentVariant.containerClassName,
      className
    )}>
      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm",
        currentVariant.iconClassName
      )}>
        <DisplayIcon className={cn("w-10 h-10", isLoading && "animate-spin")} />
      </div>
      
      <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground font-medium max-w-[280px] mb-8 leading-relaxed">
        {description}
      </p>

      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          disabled={isLoading}
          className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl transition-all active:scale-95"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
