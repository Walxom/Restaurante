"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ChefHat, Bell, BellRing, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

interface DashboardHeaderProps {
  companyName: string
  userName?: string
  isOnline: boolean
  alertsCount?: number
  onNotificationsClick?: () => void
  onSignOut?: () => void
  children?: ReactNode
}

export function DashboardPageHeader({
  companyName,
  userName,
  isOnline,
  alertsCount = 0,
  onNotificationsClick,
  onSignOut,
  children,
}: DashboardHeaderProps) {
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    } else {
      signOut({ callbackUrl: "/login" })
    }
  }

  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border/50 shadow-sm shadow-black/10 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-linear-to-tr from-blue-600/90 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/5">
              <ChefHat className="w-6 h-6 text-white drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-none mb-1">
                {companyName}
              </h1>
              <div className="flex items-center gap-2">
                {userName && (
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap truncate max-w-[110px] sm:max-w-none">
                    {userName}
                  </p>
                )}
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700/50 shrink-0 whitespace-nowrap">
                  <div
                    className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
                      isOnline
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    }`}
                  ></div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight shrink-0 whitespace-nowrap">
                    {isOnline ? "En línea" : "Desconectado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNotificationsClick && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
                  onClick={onNotificationsClick}
                >
                  {alertsCount > 0 ? (
                    <BellRing className="w-5 h-5 animate-bounce-subtle" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </Button>

                {alertsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 dark:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-500/40 border-2 border-background animate-in zoom-in-50 duration-300">
                    {alertsCount > 9 ? "9+" : alertsCount}
                  </div>
                )}
              </div>
            )}

            {children && <div className="flex items-center gap-2">{children}</div>}

            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
