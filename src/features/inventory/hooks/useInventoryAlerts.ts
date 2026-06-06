"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

import { type AlertStats } from "@/types"

export function useInventoryAlerts() {
  const { data: session } = useSession()
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchAlertStats = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/inventory-alerts?statsOnly=true')
      if (response.ok) {
        const data = await response.json()
        setAlertStats(data.stats)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas de alertas:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchAlertStats()
    }
  }, [session, fetchAlertStats])

  return {
    alertStats,
    isLoading,
    refresh: fetchAlertStats
  }
}
