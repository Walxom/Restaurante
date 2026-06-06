"use client"

import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  backTo?: string
  onBack?: () => void
  icon?: LucideIcon
  iconBg?: string
  iconClass?: string
  maxWidth?: string
  children?: ReactNode
  className?: string
}

export function AdminPageHeader({
  title,
  subtitle,
  backTo = "/dashboard",
  onBack,
  icon: Icon,
  iconBg = "bg-primary/10",
  iconClass = "text-primary",
  maxWidth = "max-w-7xl",
  children,
  className,
}: PageHeaderProps) {
  const router = useRouter()
  const handleBack = onBack ?? (() => router.push(backTo))

  return (
    <header className={cn("bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 transition-all duration-300", className)}>
      <div className={cn(maxWidth, "mx-auto px-4 sm:px-6 lg:px-8")}>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className={cn("hidden sm:flex h-10 w-10 shrink-0 rounded-2xl items-center justify-center border border-primary/20", iconBg)}>
                  <Icon className={cn("w-5 h-5", iconClass)} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-widest leading-none truncate">
                  {title}
                </h1>
                {subtitle && (
                  <div className="mt-0.5">
                    {typeof subtitle === "string" ? (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate hidden md:block">
                        {subtitle}
                      </p>
                    ) : subtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
          {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
      </div>
    </header>
  )
}
