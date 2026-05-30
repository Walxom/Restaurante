"use client"

import { useState } from "react"
import { BarChart3, Clock, DollarSign, Award, CreditCard, ShoppingBag, UtensilsCrossed } from "lucide-react"
import { SalesStats } from "../hooks/useSales"

interface SalesAnalyticsPanelProps {
  stats: SalesStats
  loading: boolean
}

export function SalesAnalyticsPanel({ stats, loading }: SalesAnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<"general" | "products" | "time">("general")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
  }

  // Skeletons de Carga
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-full bg-card/40 backdrop-blur-md rounded-2xl border border-border/50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[350px] bg-card/40 backdrop-blur-md rounded-3xl border border-border/50" />
          <div className="h-[350px] bg-card/40 backdrop-blur-md rounded-3xl border border-border/50" />
        </div>
      </div>
    )
  }

  // Extraer métricas con valores por defecto seguros
  const topProducts = stats.topProducts || []
  const topWaiters = stats.topWaiters || []
  const paymentMethods = stats.paymentMethods || []
  const orderTypes = stats.orderTypes || []
  const salesByHour = stats.salesByHour || []

  // Cálculos para porcentajes y máximos de gráficos
  const maxProductQty = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.quantity)) : 1
  const maxHourSales = salesByHour.length > 0 ? Math.max(...salesByHour.map(h => h.sales)) : 1
  const totalSalesFromTypes = orderTypes.reduce((sum, t) => sum + t.revenue, 0) || 1
  const totalSalesFromPayments = paymentMethods.reduce((sum, p) => sum + p.revenue, 0) || 1

  return (
    <div className="space-y-6">
      {/* SECTOR DE PESTAÑAS ANÁLITICAS */}
      <div className="flex p-1.5 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm overflow-x-auto gap-1">
        {[
          { id: "general", label: "Distribución Comercial", icon: Award },
          { id: "products", label: "Top Ventas & Personal", icon: ShoppingBag },
          { id: "time", label: "Análisis Temporal (Horas Pico)", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 shrink-0 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER DIVERGENTE SEGÚN LA PESTAÑA ACTIVA */}
      <div className="transition-all duration-500">
        
        {/* PESTAÑA: DISTRIBUCIÓN GENERAL */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CANALES DE VENTA (TIPOS DE ORDEN) */}
            <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1 mb-6">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  Canales de Atención
                </h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Desglose de ingresos según tipo de servicio
                </p>
              </div>

              {orderTypes.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  Sin registros en este periodo
                </div>
              ) : (
                <div className="space-y-5">
                  {orderTypes.map((type, idx) => {
                    const percentage = Math.round((type.revenue / totalSalesFromTypes) * 100);
                    let color = "bg-primary";
                    if (type.type === "LLEVAR") color = "bg-amber-500";
                    if (type.type === "DELIVERY") color = "bg-indigo-500";

                    return (
                      <div key={idx} className="space-y-2 group">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                            {type.type === "MESA" ? "Consumo en Salón" : type.type === "LLEVAR" ? "Para Llevar" : "Delivery"}
                          </span>
                          <div className="space-x-3 text-right">
                            <span className="text-muted-foreground">{type.count} pedidos</span>
                            <span className="text-foreground">{formatCurrency(type.revenue)}</span>
                            <span className="text-primary">{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-border/40 rounded-full overflow-hidden p-0.5 border border-border/20">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1 mb-6">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Métodos de Pago
                </h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Volumen monetario según pasarela e ingresos
                </p>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  Sin registros en este periodo
                </div>
              ) : (
                <div className="space-y-5">
                  {paymentMethods.map((pm, idx) => {
                    const percentage = Math.round((pm.revenue / totalSalesFromPayments) * 100);
                    let color = "bg-emerald-500";
                    if (pm.method === "TARJETA") color = "bg-blue-500";
                    if (pm.method === "YAPE") color = "bg-purple-500";
                    if (pm.method === "PLIN") color = "bg-teal-500";

                    return (
                      <div key={idx} className="space-y-2 group">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                            {pm.method}
                          </span>
                          <div className="space-x-3 text-right">
                            <span className="text-muted-foreground">{pm.count} trans.</span>
                            <span className="text-foreground">{formatCurrency(pm.revenue)}</span>
                            <span className="text-emerald-500">{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-border/40 rounded-full overflow-hidden p-0.5 border border-border/20">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA: TOP PLATOS & MESEROS */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PLATOS MÁS VENDIDOS */}
            <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1 mb-6">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Platos Más Vendidos (Top 5)
                </h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Productos líderes en volumen de preparación
                </p>
              </div>

              {topProducts.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  Sin registros de platos en este periodo
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, idx) => {
                    const widthPct = Math.max(10, Math.round((p.quantity / maxProductQty) * 100));

                    return (
                      <div key={idx} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-foreground font-black flex items-center gap-2 truncate">
                            <span className="text-primary w-4 inline-block">#{idx + 1}</span>
                            {p.name}
                          </span>
                          <span className="text-muted-foreground shrink-0 pl-2">
                            {p.quantity} uds. <span className="text-foreground ml-2 font-black">{formatCurrency(p.revenue)}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-border/20 rounded-full overflow-hidden border border-border/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-1000"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PERFORMANCE DE MESEROS */}
            <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1 mb-6">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Rendimiento del Personal (Meseros)
                </h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Líderes de atención y facturación en salón
                </p>
              </div>

              {topWaiters.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  Sin registros de meseros en este periodo
                </div>
              ) : (
                <div className="space-y-4">
                  {topWaiters.map((w, idx) => {
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤";

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-foreground/[0.02] border border-border/30 hover:bg-foreground/[0.04] transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg shrink-0">{medal}</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-foreground uppercase tracking-wide truncate">
                              {w.name}
                            </p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                              {w.orders} pedidos atendidos
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-foreground">
                            {formatCurrency(w.revenue)}
                          </p>
                          <p className="text-[8px] font-bold text-primary uppercase tracking-widest">
                            {w.orders > 0 ? formatCurrency(w.revenue / w.orders) : "S/ 0.00"} prom
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA: ANÁLISIS TEMPORAL */}
        {activeTab === "time" && (
          <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm">
            <div className="space-y-1 mb-8">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Ventas por Hora (Peak Hours)
              </h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Identificación de picos de almuerzo y cena para optimización operativa
              </p>
            </div>

            {salesByHour.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                Sin registros temporales en este periodo
              </div>
            ) : (
              <div className="space-y-6">
                {/* GRÁFICO DE BARRAS CSS */}
                <div className="h-48 flex items-end gap-1 sm:gap-2 px-2 border-b border-border/50">
                  {salesByHour.map((h, idx) => {
                    const heightPct = Math.max(2, Math.round((h.sales / maxHourSales) * 100));
                    // Resaltar horas pico de almuerzo (12-15) y cena (19-22)
                    const isPeak = (h.hour >= 12 && h.hour <= 15) || (h.hour >= 19 && h.hour <= 22);

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        
                        {/* Tooltip Hover */}
                        <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground border border-border p-2 rounded-xl text-[8px] font-black uppercase tracking-wider opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 shadow-xl z-20 whitespace-nowrap text-center">
                          <p className="text-foreground">{h.hour}:00 hrs</p>
                          <p className="text-primary">{formatCurrency(h.sales)}</p>
                          <p className="text-muted-foreground text-[7px]">{h.orders} pedidos</p>
                        </div>

                        {/* Barra */}
                        <div
                          className={`w-full rounded-t-lg transition-all duration-700 ${
                            isPeak
                              ? "bg-gradient-to-t from-primary to-purple-600 hover:from-primary/85 hover:to-purple-500 shadow-md shadow-primary/10"
                              : "bg-muted-foreground/20 hover:bg-muted-foreground/30"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Eje de Horas */}
                <div className="flex text-[8px] font-black text-muted-foreground uppercase tracking-widest px-2">
                  {salesByHour.map((h, idx) => (
                    <span key={idx} className="flex-1 text-center truncate">
                      {h.hour === 0 ? "12 AM" : h.hour === 12 ? "12 PM" : h.hour % 12 === 0 ? "12" : h.hour % 12}
                    </span>
                  ))}
                </div>

                {/* Indicador de Leyenda */}
                <div className="flex flex-wrap gap-4 justify-center text-[8px] font-black uppercase tracking-widest border-t border-border/30 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-tr from-primary to-purple-600 rounded-md" />
                    <span>Horas Pico de Consumo (Almuerzo y Cena)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted-foreground/20 rounded-md" />
                    <span>Horas de Flujo Moderado</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
