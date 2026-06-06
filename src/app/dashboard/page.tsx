"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { useNavigationLoading } from "@/hooks/useNavigationLoading"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/layout/DashboardPageHeader"
import InvoiceWidget from "@/features/dashboard/components/InvoiceWidget"
import PedidosPorServirWidget from "@/features/dashboard/components/PedidosPorServirWidget"
import PedidosServidosWidget from "@/features/dashboard/components/PedidosServidosWidget"
import {
  Users, Clock, DollarSign, LogOut, TrendingUp, Package,
  BookOpen, Brain, FileText, Printer, Settings, Utensils,
  Activity, ChevronRight,
} from "lucide-react"
import { useCompanyName, useSystemConfig } from "@/features/dashboard/hooks/useSystemConfig"
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats"
import { NotificationDrawer } from "@/features/dashboard/components/NotificationDrawer"
import QuickActionButton, { type ActionColor } from "@/features/dashboard/components/QuickActionButton"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { StatCard } from "@/features/dashboard/components/StatCard"
import { usePrinter } from "@/features/billing/hooks/usePrinter"
import { RoleGuard } from "@/components/auth/role-guard"
import { StatusAlert } from "@/components/ui/StatusAlert"

// Colores de acento: saturados, legibles en light y dark
const CORAL = 'oklch(0.62 0.19 32)'
const TEAL  = 'oklch(0.55 0.17 185)'

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const { isNavigating, navigateWithLoading } = useNavigationLoading()
  const { companyName } = useCompanyName()
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false)

  const { serviceStatus, hardwareStatus, message: printerMessage } = usePrinter()

  const {
    stats,
    loading,
    error,
    ordersConnected,
    tablesConnected,
    widgetRefreshTrigger,
    fetchStats,
    getAlertsCount,
  } = useDashboardStats()

  const { formatCurrency } = useSystemConfig()

  const handleSignOut  = () => setShowSignOutModal(true)
  const confirmSignOut = () => signOut({ callbackUrl: "/login" })
  const cancelSignOut  = () => setShowSignOutModal(false)

  const navigateToConfig       = () => navigateWithLoading("/dashboard/configuracion")
  const navigateToMenu         = () => navigateWithLoading("/menu")
  const navigateToInventario   = () => navigateWithLoading("/dashboard/inventario")
  const navigateToFacturacion  = () => navigateWithLoading("/dashboard/facturacion")
  const navigateToVentas       = () => navigateWithLoading("/dashboard/ventas")
  const navigateToImpresion    = () => navigateWithLoading("/impresion")
  const navigateToInteligencia = () => navigateWithLoading("/dashboard/inteligencia")

  const isLive = ordersConnected && tablesConnected

  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      {/*
        Sin clase "dark" forzada — el tema sigue la preferencia del sistema/usuario.
        Las clases ocean-* tienen variantes light y dark en globals.css.
      */}
      <div className="min-h-screen relative overflow-x-hidden">

        {/* ── PREFETCH (oculto) ── */}
        <div className="hidden">
          <Link href="/mesas"                   prefetch={true}><span /></Link>
          <Link href="/menu"                    prefetch={true}><span /></Link>
          <Link href="/pedidos"                 prefetch={true}><span /></Link>
          <Link href="/pedidos/nuevo"           prefetch={true}><span /></Link>
          <Link href="/dashboard/inventario"    prefetch={true}><span /></Link>
          <Link href="/dashboard/facturacion"   prefetch={true}><span /></Link>
          <Link href="/dashboard/ventas"        prefetch={true}><span /></Link>
          <Link href="/impresion"               prefetch={true}><span /></Link>
          <Link href="/dashboard/configuracion" prefetch={true}><span /></Link>
          <Link href="/dashboard/inteligencia"  prefetch={true}><span /></Link>
        </div>

        {/* ── HEADER ── */}
        <DashboardPageHeader
          companyName={companyName}
          userName={session?.user?.name}
          isOnline={isLive}
          alertsCount={getAlertsCount()}
          onNotificationsClick={() => setIsNotificationDrawerOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

          {/* BARRA DE ESTADO EN VIVO */}
          <div className="mb-5 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.07]">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span
                className="animate-ping absolute inset-0 rounded-full opacity-70"
                style={{ background: isLive ? TEAL : CORAL }}
              />
              <span
                className="relative h-2 w-2 rounded-full"
                style={{ background: isLive ? TEAL : CORAL }}
              />
            </span>
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: isLive ? TEAL : CORAL, letterSpacing: '0.18em' }}
            >
              {isLive ? 'Sistema en vivo' : 'Reconectando…'}
            </span>
            <div className="h-3 w-px mx-1 flex-shrink-0 bg-foreground/10" />
            <span className="text-[11px] text-muted-foreground">{companyName}</span>
            <div className="ml-auto flex items-center gap-2">
              <Activity className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[11px] font-mono text-muted-foreground/50">
                {stats?.ultimaActualizacion
                  ? new Date(stats.ultimaActualizacion).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
            </div>
          </div>

          {/* ALERTA DE IMPRESIÓN */}
          <StatusAlert
            variant={serviceStatus === 'active' ? 'success' : 'warning'}
            icon={Printer}
            title={`Impresión: ${serviceStatus === 'active' ? 'ACTIVA' : 'DETENIDA'}`}
            description={
              serviceStatus === 'active'
                ? (hardwareStatus === 'connected' ? 'Impresora lista.' : printerMessage)
                : 'Los pedidos NO se imprimirán automáticamente en cocina.'
            }
            pulse={serviceStatus !== 'active'}
            action={
              <Button size="sm" variant="outline" onClick={navigateToImpresion}
                className="rounded-full border-current/30 hover:bg-current/5 text-xs w-full sm:w-auto">
                Gestionar
              </Button>
            }
            className="mb-5"
          />

          {error && (
            <StatusAlert
              variant="error"
              title="Error al cargar estadísticas"
              description={error}
              action={
                <Button onClick={fetchStats} size="sm" variant="outline" className="text-xs w-full sm:w-auto">
                  Reintentar
                </Button>
              }
              className="mb-5"
            />
          )}

          {/* ETIQUETA DE SECCIÓN */}
          <p
            className="text-[10px] font-bold uppercase mb-3 text-muted-foreground/60"
            style={{ letterSpacing: '0.22em' }}
          >
            — Indicadores principales
          </p>

          {/* TARJETAS DE ESTADÍSTICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {[
              {
                label: 'Mesas Disponibles',
                value: stats?.mesas.DISPONIBLE ?? 0,
                icon: Users,
                color: 'blue' as const,
              },
              {
                label: 'Pedidos Activos',
                value: stats?.activeOrders ?? 0,
                icon: Clock,
                color: 'orange' as const,
              },
              {
                label: 'Ventas Activas',
                value: formatCurrency(stats?.totalSales ?? 0),
                icon: DollarSign,
                color: 'green' as const,
              },
              {
                label: 'Ventas del Día',
                value: formatCurrency(stats?.ventasHoy?.total ?? 0),
                subValue: stats ? `${stats.ventasHoy.cantidad} ventas` : undefined,
                icon: TrendingUp,
                color: 'purple' as const,
              },
            ].map((stat) => (
              <StatCard key={stat.label} {...stat} loading={loading} />
            ))}
          </div>

          {/* BOTONES DE ACCIÓN PRINCIPAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            {[
              {
                title: 'Gestionar Pedidos',
                subtitle: 'Ver y administrar todos los pedidos del sistema',
                icon: Package,
                accent: CORAL,
                onClick: () => router.push('/pedidos'),
              },
              {
                title: 'Administrar Mesas',
                subtitle: 'Gestionar estado y configuración de mesas',
                icon: Utensils,
                accent: TEAL,
                onClick: () => router.push('/mesas'),
              },
            ].map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                disabled={isNavigating}
                className="ocean-action-btn relative overflow-hidden rounded-2xl p-5 text-left w-full group"
              >
                {/* Gradiente diagonal en hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${action.accent}10 0%, transparent 60%)` }}
                />
                {/* Orb en esquina inferior derecha */}
                <div
                  className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none translate-x-8 translate-y-8"
                  style={{ background: `radial-gradient(circle at center, ${action.accent}18, transparent 70%)` }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${action.accent}18` }}
                    >
                      <action.icon className="w-5 h-5" style={{ color: action.accent }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-0.5 text-foreground">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {action.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 opacity-40 group-hover:opacity-80"
                    style={{ color: action.accent }}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* WIDGETS EN TIEMPO REAL */}
          <p
            className="text-[10px] font-bold uppercase mb-3 text-muted-foreground/60"
            style={{ letterSpacing: '0.22em' }}
          >
            — Pedidos en tiempo real
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 mb-5">
            <PedidosPorServirWidget
              refreshTrigger={widgetRefreshTrigger}
              userRole="JEFE"
              maxOrders={6}
              onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
            />
            <PedidosServidosWidget
              refreshTrigger={widgetRefreshTrigger}
              userRole="JEFE"
              maxOrders={6}
              onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
            />
          </div>

          {/* WIDGET DE FACTURACIÓN */}
          <div className="mb-5">
            <InvoiceWidget />
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div className="rounded-2xl overflow-hidden bg-foreground/[0.02] border border-foreground/[0.06]">
            <div className="px-5 py-4 border-b border-foreground/[0.06]">
              <p
                className="text-[10px] font-bold uppercase text-muted-foreground/60"
                style={{ letterSpacing: '0.22em' }}
              >
                — Acciones rápidas
              </p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                {[
                  { label: 'Menú',         icon: BookOpen,   color: 'orange' as ActionColor, onClick: navigateToMenu },
                  { label: 'Inventario',   icon: Package,    color: 'purple' as ActionColor, onClick: navigateToInventario },
                  { label: 'Comprobantes', icon: FileText,   color: 'indigo' as ActionColor, onClick: navigateToFacturacion },
                  { label: 'Ventas',       icon: TrendingUp, color: 'pink'   as ActionColor, onClick: navigateToVentas },
                  { label: 'Impresión',    icon: Printer,    color: 'teal'   as ActionColor, onClick: navigateToImpresion },
                  { label: 'IA',           icon: Brain,      color: 'purple' as ActionColor, onClick: navigateToInteligencia },
                  { label: 'Config',       icon: Settings,   color: 'gray'   as ActionColor, onClick: navigateToConfig },
                ].map((action) => (
                  <QuickActionButton
                    key={action.label}
                    label={action.label}
                    icon={action.icon}
                    color={action.color}
                    onClick={action.onClick}
                    disabled={isNavigating}
                  />
                ))}
              </div>
            </div>
          </div>

        </main>

        {/* DRAWER DE NOTIFICACIONES */}
        <NotificationDrawer
          isOpen={isNotificationDrawerOpen}
          onClose={() => setIsNotificationDrawerOpen(false)}
          stats={stats}
          loading={loading}
        />

        {/* MODAL DE CIERRE DE SESIÓN */}
        <ConfirmationModal
          isOpen={showSignOutModal}
          onClose={cancelSignOut}
          onConfirm={confirmSignOut}
          title="¿Cerrar sesión?"
          description="¿Estás seguro de que quieres cerrar tu sesión? Tendrás que volver a ingresar tus credenciales para acceder."
          confirmText="Cerrar sesión"
          variant="danger"
          icon={LogOut}
        />
      </div>
    </RoleGuard>
  )
}
