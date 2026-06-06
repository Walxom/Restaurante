"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { useNavigationLoading } from "@/hooks/useNavigationLoading"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DashboardPageHeader } from "@/components/layout/DashboardPageHeader"
import InvoiceWidget from "@/features/dashboard/components/InvoiceWidget"
import PedidosPorServirWidget from "@/features/dashboard/components/PedidosPorServirWidget"
import PedidosServidosWidget from "@/features/dashboard/components/PedidosServidosWidget"
import { Users, TrendingUp, Package, DollarSign, Plus, Eye, LogOut, Truck, Clock, ArrowUp, ArrowDown, Activity, Utensils, CheckCircle2, AlertCircle, FileText, Printer, Settings, BookOpen, Brain } from "lucide-react"
import { useCompanyName, useSystemConfig } from "@/features/dashboard/hooks/useSystemConfig"
import ActionCard from "@/features/dashboard/components/ActionCard"
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats"
import { NotificationDrawer } from "@/features/dashboard/components/NotificationDrawer"
import QuickActionButton, { ActionColor } from "@/features/dashboard/components/QuickActionButton"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { StatCard } from "@/features/dashboard/components/StatCard"
import { usePrinter } from "@/features/billing/hooks/usePrinter"
import { RoleGuard } from "@/components/auth/role-guard"

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const { isNavigating, navigateWithLoading } = useNavigationLoading()
  const { companyName } = useCompanyName()
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false)

  const { serviceStatus, hardwareStatus, message: printerMessage } = usePrinter()

  // Usar el nuevo hook para toda la lógica de datos y sockets
  const {
    stats,
    loading,
    error,
    ordersConnected,
    tablesConnected,
    widgetRefreshTrigger,
    fetchStats,
    getAlertsCount
  } = useDashboardStats()

  const { formatCurrency } = useSystemConfig()

  const handleSignOut = () => {
    setShowSignOutModal(true)
  }

  const confirmSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const cancelSignOut = () => {
    setShowSignOutModal(false)
  }

  // Funciones de navegación optimizadas
  const navigateToConfig = () => navigateWithLoading("/dashboard/configuracion")
  const navigateToMenu = () => navigateWithLoading("/menu")
  const navigateToInventario = () => navigateWithLoading("/dashboard/inventario")
  const navigateToFacturacion = () => navigateWithLoading("/dashboard/facturacion")
  const navigateToVentas = () => navigateWithLoading("/dashboard/ventas")
  const navigateToImpresion = () => navigateWithLoading("/impresion")
  const navigateToInteligencia = () => navigateWithLoading("/dashboard/inteligencia")


  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-background transition-colors duration-500">
        <div className="fixed inset-0 bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 pointer-events-none" />
        <div className="relative z-10 flex flex-col">
      {/* Prefetch de rutas principales para mejorar navegación */}
      <div className="hidden">
        <Link href="/mesas" prefetch={true}><span></span></Link>
        <Link href="/menu" prefetch={true}><span></span></Link>
        <Link href="/pedidos" prefetch={true}><span></span></Link>
        <Link href="/pedidos/nuevo" prefetch={true}><span></span></Link>
        <Link href="/dashboard/inventario" prefetch={true}><span></span></Link>
        <Link href="/dashboard/facturacion" prefetch={true}><span></span></Link>
        <Link href="/dashboard/ventas" prefetch={true}><span></span></Link>
        <Link href="/impresion" prefetch={true}><span></span></Link>
        <Link href="/dashboard/configuracion" prefetch={true}><span></span></Link>
        <Link href="/dashboard/inteligencia" prefetch={true}><span></span></Link>
      </div>

      {/* Header minimalista */}
      <DashboardPageHeader
        companyName={companyName}
        userName={session?.user?.name}
        isOnline={ordersConnected && tablesConnected}
        alertsCount={getAlertsCount()}
        onNotificationsClick={() => setIsNotificationDrawerOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Alerta de Estado de Impresión */}
        <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 shadow-sm ${
          serviceStatus === 'active' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${serviceStatus === 'active' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Servicio de Impresión: {serviceStatus === 'active' ? 'ACTIVO' : 'DETENIDO'}
              </p>
              <p className="text-xs opacity-80">
                {serviceStatus === 'active' 
                  ? (hardwareStatus === 'connected' ? 'Impresora lista para recibir pedidos.' : `Atención: ${printerMessage}`)
                  : 'Los pedidos NO se imprimirán automáticamente en cocina.'}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={navigateToImpresion}
            className={`rounded-full border-current/30 hover:bg-white/10 dark:hover:bg-black/10 transition-colors ${
              serviceStatus === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            Gestionar Impresión
          </Button>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              onClick={fetchStats}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Estadísticas compactas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[
            {
              label: 'Mesas Disponibles',
              value: stats?.mesas.DISPONIBLE || 0,
              icon: Users,
              color: 'blue' as const,
            },
            {
              label: 'Activos',
              value: stats?.activeOrders || 0,
              icon: Clock,
              color: 'orange' as const,
            },
            {
              label: 'Ventas Activas',
              value: formatCurrency(stats?.totalSales || 0),
              icon: DollarSign,
              color: 'green' as const,
            },
            {
              label: 'Ventas del Día',
              value: formatCurrency(stats?.ventasHoy.total || 0),
              subValue: stats ? `${stats.ventasHoy.cantidad} ventas` : undefined,
              icon: DollarSign,
              color: 'purple' as const,
            },
          ].map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              subValue={stat.subValue}
              icon={stat.icon}
              color={stat.color}
              loading={loading}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <ActionCard
            title="Gestionar Pedidos"
            description="Ver y administrar todos los pedidos del sistema"
            icon={Package}
            onClick={() => router.push("/pedidos")}
            variant="primary"
          />

          <ActionCard
            title="Administrar Mesas"
            description="Gestionar estado y configuración de mesas"
            icon={Utensils}
            onClick={() => router.push("/mesas")}
            variant="secondary"
          />
        </div>

        {/* Sección principal de datos en tiempo real */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Widget de Pedidos por Servir */}
          <PedidosPorServirWidget
            refreshTrigger={widgetRefreshTrigger}
            userRole="JEFE"
            maxOrders={6}
            onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
          />

          {/* Widget de Pedidos Servidos */}
          <PedidosServidosWidget
            refreshTrigger={widgetRefreshTrigger}
            userRole="JEFE"
            maxOrders={6}
            onOrderClick={(orderId) => router.push(`/pedidos/${orderId}/detalles`)}
          />
        </div>

        {/* Widget de Facturación - Ocupa 2 columnas en pantallas grandes */}
        <div className="mb-4 sm:mb-6">
          <InvoiceWidget />
        </div>

        {/* Widgets administrativos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Acciones Rápidas - Ocupa 2 columnas en pantallas grandes */}
          <div className="xl:col-span-3 bg-card/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="p-4 sm:p-6 border-b border-border/50">
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-3 uppercase tracking-tighter">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                Acciones Rápidas
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Menú', icon: BookOpen, color: 'orange' as ActionColor, onClick: navigateToMenu },
                  { label: 'Inventario', icon: Package, color: 'purple' as ActionColor, onClick: navigateToInventario },
                  { label: 'Comprobantes', icon: FileText, color: 'indigo' as ActionColor, onClick: navigateToFacturacion },
                  { label: 'Ventas', icon: TrendingUp, color: 'pink' as ActionColor, onClick: navigateToVentas },
                  { label: 'Impresión', icon: Printer, color: 'teal' as ActionColor, onClick: navigateToImpresion },
                  { label: 'IA', icon: Brain, color: 'purple' as ActionColor, onClick: navigateToInteligencia },
                  { label: 'Config', icon: Settings, color: 'gray' as ActionColor, onClick: navigateToConfig },
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

        </div>

        {/* Notificaciones (Drawer) */}
        <NotificationDrawer
          isOpen={isNotificationDrawerOpen}
          onClose={() => setIsNotificationDrawerOpen(false)}
          stats={stats}
          loading={loading}
        />

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
      </main>
    </div>
    </div>
    </RoleGuard>
  )
}
