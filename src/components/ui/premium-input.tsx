"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from "@/lib/utils"

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: LucideIcon
  error?: string
}

const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ label, icon: Icon, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1">
          {label}
        </Label>
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          )}
          <Input
            ref={ref}
            className={cn(
              "h-12 bg-foreground/[0.03] border-border/50 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all",
              Icon && "pl-11",
              error && "border-rose-500/50 bg-rose-500/5",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
PremiumInput.displayName = "PremiumInput"

export { PremiumInput }
