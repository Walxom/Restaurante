"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  children?: ReactNode
  className?: string
}

export function AdminPageHeader({
  title,
  subtitle,
  backTo = "/dashboard",
  children,
  className,
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(backTo)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {children && <div className="flex gap-2">{children}</div>}
        </div>
      </div>
    </header>
  )
}
