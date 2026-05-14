"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export interface Sale {
  id: string
  orderNumber: string
  totalAmount: number | string
  createdAt: string
  status: string
  table?: { number: number }
  user: { name: string; username: string }
  orderItems: Array<{
    quantity: number
    product: { name: string; price: number | string }
  }>
}

export interface SalesStats {
  totalSales: number
  totalOrders: number
  averageTicket: number
  completedOrders: number
  cancelledOrders: number
  topProducts?: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  salesByHour?: Array<{
    hour: number
    sales: number
    orders: number
  }>
  topWaiters?: Array<{
    name: string
    orders: number
    revenue: number
  }>
}

interface UseSalesProps {
  limit?: number
}

export function useSales({ limit = 10 }: UseSalesProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  })
  
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [filter, setFilter] = useState("day")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/sales/years')
      if (response.ok) {
        const data = await response.json()
        setAvailableYears(data.years)
      }
    } catch (error) {
      console.error('Error al cargar años disponibles:', error)
    }
  }, [])

  const fetchSalesData = useCallback(async () => {
    try {
      if (sales.length === 0) setLoading(true)
      else setPaginationLoading(true)

      const url = new URL(`${window.location.origin}/api/sales`)
      url.searchParams.set("filter", filter)
      url.searchParams.set("status", statusFilter)
      url.searchParams.set("page", page.toString())
      url.searchParams.set("limit", limit.toString())
      url.searchParams.set("includeExtended", "true")

      if (filter === "custom" && startDate && endDate) {
        url.searchParams.set("startDate", startDate)
        url.searchParams.set("endDate", endDate)
      }
      if (selectedYear) {
        url.searchParams.set("year", selectedYear)
      }

      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setSales(data.sales)
        setStats(data.stats)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Error al cargar datos de ventas:", error)
    } finally {
      setLoading(false)
      setPaginationLoading(false)
    }
  }, [filter, statusFilter, page, limit, startDate, endDate, selectedYear, sales.length])

  useEffect(() => {
    fetchAvailableYears()
  }, [fetchAvailableYears])

  useEffect(() => {
    if (session?.user?.role && ["ADMIN", "JEFE"].includes(session.user.role)) {
      fetchSalesData()
    } else if (session?.user?.role) {
      router.push("/dashboard")
    }
  }, [session, router, fetchSalesData])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1)
  }, [filter, statusFilter, startDate, endDate, selectedYear])

  return {
    sales,
    stats,
    loading,
    paginationLoading,
    filter,
    setFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedYear,
    setSelectedYear,
    availableYears,
    refresh: fetchSalesData
  }
}
