"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

export interface Invoice {
  id: string
  number: string
  type: "BOLETA" | "FACTURA" | "SIN_BOLETA"
  customerName?: string
  customerRuc?: string
  total: number
  paymentMethod: string
  status: "ISSUED" | "CANCELLED" | "PENDING_RECEIPT"
  issuedAt: string
  user: { name: string }
  order?: {
    orderNumber: string
    table?: { number: number }
  }
}

export interface InvoiceStats {
  summary: {
    totalInvoices: number
    totalRevenue: number
    averageTicket: number
  }
  byType: Array<{
    type: string
    count: number
    revenue: number
  }>
  byPaymentMethod: Array<{
    method: string
    count: number
    revenue: number
  }>
}

export function useInvoices() {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [withoutReceiptFilter, setWithoutReceiptFilter] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      if (withoutReceiptFilter) {
        const params = new URLSearchParams({
          status: "COMPLETED",
          withoutInvoice: "true",
          showAll: "true"
        })
        
        const response = await fetch(`/api/orders?${params}`)
        if (!response.ok) throw new Error("Error al cargar pedidos sin boleta")
        
        const { orders: data } = await response.json()

        // Filtrar localmente por búsqueda si es aplicable
        let filteredOrders = data
        if (search) {
          const searchLower = search.toLowerCase()
          filteredOrders = data.filter((order: any) => 
            order.orderNumber.toLowerCase().includes(searchLower) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
            (order.customerDni && order.customerDni.toLowerCase().includes(searchLower))
          )
        }
        
        const ordersAsInvoices = filteredOrders.map((order: any) => ({
          id: order.id,
          number: order.orderNumber,
          type: "SIN_BOLETA",
          customerName: order.customerName || "Cliente General",
          customerRuc: order.customerDni || "",
          total: order.totalAmount,
          paymentMethod: "N/A",
          status: "PENDING_RECEIPT",
          issuedAt: order.completedAt || order.updatedAt,
          user: { name: "Sistema" },
          order: {
            orderNumber: order.orderNumber,
            table: order.table
          }
        }))
        
        // Paginación local en el cliente
        const itemsPerPage = 10
        setTotalPages(Math.ceil(ordersAsInvoices.length / itemsPerPage) || 1)
        
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        setInvoices(ordersAsInvoices.slice(startIndex, endIndex)) 
      } else {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "10"
        })
        
        if (search) params.append("search", search)
        if (typeFilter) params.append("type", typeFilter)
        if (paymentFilter) params.append("paymentMethod", paymentFilter)
        if (statusFilter) params.append("status", statusFilter)
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)

        const response = await fetch(`/api/invoices?${params}`)
        if (!response.ok) throw new Error("Error al cargar facturas")

        const data = await response.json()
        setInvoices(data.invoices)
        setTotalPages(data.pagination.pages)
      }
      setError(null)
    } catch (err) {
      setError(withoutReceiptFilter ? "Error al cargar pedidos sin boleta" : "Error al cargar las facturas")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, typeFilter, paymentFilter, statusFilter, startDate, endDate, withoutReceiptFilter])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/invoices/stats?period=today")
      if (!response.ok) throw new Error("Error al cargar estadísticas")

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error loading stats:", err)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "JEFE") {
      fetchInvoices()
      fetchStats()
      
      // Obtener todos los pedidos completados sin factura para el conteo real
      fetch(`/api/orders?status=COMPLETED&withoutInvoice=true&showAll=true`)
        .then(res => res.json())
        .then(({ orders, pagination }) => {
          setPendingCount(pagination?.total ?? orders?.length ?? 0)
        })
        .catch(err => console.error("Error loading pending count:", err))
    }
  }, [session, fetchInvoices, fetchStats])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchInvoices()
  }

  const clearFilters = () => {
    setSearch("")
    setTypeFilter("")
    setPaymentFilter("")
    setStatusFilter("")
    setStartDate("")
    setEndDate("")
    setWithoutReceiptFilter(false)
    setCurrentPage(1)
  }

  return {
    invoices,
    stats,
    loading,
    error,
    filters: {
      search, setSearch,
      typeFilter, setTypeFilter,
      paymentFilter, setPaymentFilter,
      statusFilter, setStatusFilter,
      startDate, setStartDate,
      endDate, setEndDate,
      withoutReceiptFilter, setWithoutReceiptFilter,
      pendingCount
    },
    pagination: {
      currentPage, setCurrentPage,
      totalPages,
    },
    fetchInvoices,
    fetchStats,
    handleSearch,
    clearFilters,
  }
}
