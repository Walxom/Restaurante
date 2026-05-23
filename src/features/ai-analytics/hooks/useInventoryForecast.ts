"use client"

import { useMemo } from "react"
import { useInventoryAlerts } from "./useAiInsights"

export function useInventoryForecast() {
  const { alerts, narrative, isLoading, error, refresh } = useInventoryAlerts()

  const stats = useMemo(() => {
    const critical = alerts.filter((a) => a.status === "CRITICAL")
    const warning = alerts.filter((a) => a.status === "WARNING")
    const ok = alerts.filter((a) => a.status === "OK")
    return { critical, warning, ok, total: alerts.length }
  }, [alerts])

  return {
    alerts,
    stats,
    narrative,
    isLoading,
    error,
    refresh,
  }
}
