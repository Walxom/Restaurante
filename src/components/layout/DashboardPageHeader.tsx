"use client"

import { type ReactNode } from "react"
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2.5 sm:py-3 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-linear-to-tr from-blue-600/90 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/5 shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-none mb-1 truncate">
                {companyName}
              </h1>
              {userName && (
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap truncate max-w-[160px] sm:max-w-none">
                  {userName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Indicador de Conexión en Tiempo Real (WebSockets / Sincronización) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                isOnline
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse"
              }`}
              title={
                isOnline
                  ? "Conexión WebSockets en tiempo real activa con cocina y mesas"
                  : "Sin conexión con el servidor en tiempo real. Intentando reconectar..."
              }
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                }`}
              />
              <span className="hidden sm:inline whitespace-nowrap">
                {isOnline ? "Sincronizado" : "Sin Conexión"}
              </span>
            </div>

            {children && <div className="flex items-center gap-2">{children}</div>}

            {onNotificationsClick && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    alertsCount > 0
                      ? `Notificaciones: ${alertsCount} alerta${alertsCount === 1 ? "" : "s"}`
                      : "Notificaciones"
                  }
                  className="w-9 h-9 sm:w-10 sm:h-10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
                  onClick={onNotificationsClick}
                >
                  {alertsCount > 0 ? (
                    <BellRing className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce-subtle" />
                  ) : (
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>

                {alertsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 dark:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-500/40 border-2 border-background animate-in zoom-in-50 duration-300">
                    {alertsCount > 9 ? "9+" : alertsCount}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              aria-label="Cerrar sesión"
              className="h-9 sm:h-10 px-2 sm:px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
            >
              <LogOut className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
