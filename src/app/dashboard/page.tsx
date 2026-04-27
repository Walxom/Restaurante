"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { useNavigationLoading } from "@/hooks/useNavigationLoading"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import InvoiceWidget from "@/components/dashboard/InvoiceWidget"
import PedidosPorServirWidget from "@/components/dashboard/PedidosPorServirWidget"
import PedidosServidosWidget from "@/components/dashboard/PedidosServidosWidget"
import { ChefHat, Users, TrendingUp, Package, DollarSign, Plus, Eye, LogOut, Truck, Clock, ArrowUp, ArrowDown, Activity, Utensils, CheckCircle2, AlertCircle, Bell, BellRing, FileText, Printer, Settings, BookOpen } from "lucide-react"
import { useCompanyName, useSystemConfig } from "@/hooks/useSystemConfig"
import ActionCard from "@/components/dashboard/ActionCard"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { NotificationDrawer } from "@/components/dashboard/NotificationDrawer"
import QuickActionButton, { ActionColor } from "@/components/dashboard/QuickActionButton"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { StatCard } from "@/components/dashboard/StatCard"
import { usePrinter } from "@/hooks/use-printer"
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


  return (
    <RoleGuard allowedRoles={["JEFE"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
      </div>

      {/* Header minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {companyName}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {session?.user?.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${ordersConnected && tablesConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                      }`}></div>
                    <span className="text-xs text-gray-400">
                      {ordersConnected && tablesConnected ? 'En línea' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Icono de notificaciones de alertas */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 relative"
                  onClick={() => setIsNotificationDrawerOpen(true)}
                >
                  {getAlertsCount() > 0 ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </Button>

                {/* Badge de contador de alertas */}
                {getAlertsCount() > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {getAlertsCount() > 9 ? '9+' : getAlertsCount()}
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Alerta de Estado de Impresión */}
        <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 ${
          serviceStatus === 'active' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-amber-50 border-amber-100 text-amber-800 animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${serviceStatus === 'active' ? 'bg-emerald-200' : 'bg-amber-200'}`}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
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
            className={`rounded-full border-current hover:bg-white/50 ${
              serviceStatus === 'active' ? 'text-emerald-700' : 'text-amber-700'
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
            onOrderClick={() => router.push('/pedidos')}
          />

          {/* Widget de Pedidos Servidos */}
          <PedidosServidosWidget
            refreshTrigger={widgetRefreshTrigger}
            userRole="JEFE"
            maxOrders={6}
            onOrderClick={() => router.push('/pedidos')}
          />
        </div>

        {/* Widget de Facturación - Ocupa 2 columnas en pantallas grandes */}
        <div className="mb-4 sm:mb-6">
          <InvoiceWidget />
        </div>

        {/* Widgets administrativos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Acciones Rápidas - Ocupa 2 columnas en pantallas grandes */}
          <Card className="xl:col-span-3 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: 'Menú', icon: BookOpen, color: 'orange' as ActionColor, onClick: navigateToMenu },
                  { label: 'Inventario', icon: Package, color: 'purple' as ActionColor, onClick: navigateToInventario },
                  { label: 'Comprobantes', icon: FileText, color: 'indigo' as ActionColor, onClick: navigateToFacturacion },
                  { label: 'Ventas', icon: TrendingUp, color: 'pink' as ActionColor, onClick: navigateToVentas },
                  { label: 'Impresión', icon: Printer, color: 'teal' as ActionColor, onClick: navigateToImpresion },
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
            </CardContent>
          </Card>

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
    </RoleGuard>
  )
}
