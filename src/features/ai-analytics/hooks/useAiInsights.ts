"use client"

import useSWR, { type Key } from "swr"
import type {
  ForecastResponse,
  InventoryResponse,
  MarketBasketResponse,
  AiEngineHealth,
} from "@/features/ai-analytics/types/ai.types"

const AI_ENGINE_URL = "/api/ai/proxy"

const makeFetcher = (timeoutMs: number) => {
  return async (url: string, options?: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...options,
      })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return res.json()
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === "AbortError") throw new Error("Timeout")
      throw err
    }
  }
}

const fastFetcher = makeFetcher(4000)
const slowFetcher = makeFetcher(20000)

export function useAiHealth() {
  const { data, error, isLoading, mutate } = useSWR<AiEngineHealth>(
    `${AI_ENGINE_URL}/health`,
    fastFetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      errorRetryCount: 0,
      shouldRetryOnError: false,
    }
  )
  return {
    health: data,
    isAiOnline: !!data && data.status === "ok",
    error,
    isLoading,
    mutate,
  }
}

function useAiData<T>(
  key: Key,
  fetcherFn: () => Promise<T>,
  refreshMs: number
) {
  const { data, error, isLoading } = useSWR<T>(key, fetcherFn, {
    refreshInterval: refreshMs,
    revalidateOnFocus: false,
    errorRetryCount: 1,
    shouldRetryOnError: false,
    dedupingInterval: 5000,
  })
  return { data, error, isLoading }
}

export function useForecast(productId?: string) {
  const key = `${AI_ENGINE_URL}/api/insights/forecast`
  const { data, error, isLoading } = useAiData<ForecastResponse>(
    [key, productId],
      () =>
        slowFetcher(key, {
          method: "POST",
          body: JSON.stringify({ productId: productId || null }),
        }),
      0
  )
  return {
    forecast: data?.ml.forecasts || [],
    narrative: data?.narrative,
    error,
    isLoading,
  }
}

export function useInventoryAlerts() {
  const key = `${AI_ENGINE_URL}/api/insights/inventory`
  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    key,
    () => slowFetcher(key, { method: "POST" }),
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
      shouldRetryOnError: false,
      dedupingInterval: 60000,
    }
  )
  return {
    alerts: data?.ml.alerts || [],
    narrative: data?.narrative,
    error,
    isLoading,
    refresh: mutate,
  }
}

export function useMarketBasket(productId?: string) {
  const key = `${AI_ENGINE_URL}/api/insights/market-basket`
  const { data, error, isLoading } = useAiData<MarketBasketResponse>(
    [key, productId],
      () =>
        slowFetcher(key, {
          method: "POST",
          body: JSON.stringify({ productId: productId || null }),
        }),
      0
  )
  return {
    rules: data?.ml.rules || [],
    suggestions: data?.ml.suggestions || [],
    narrative: data?.narrative,
    error,
    isLoading,
  }
}

export async function triggerRetrainAll(): Promise<{ status: string; message: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/train/all`, {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function startAiService(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/ai/service", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.details || err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function stopAiService(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/ai/service", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "stop" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.details || err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function getAiServiceLogs(): Promise<string[]> {
  try {
    const res = await fetch("/api/ai/service?logs=true")
    if (!res.ok) return []
    const data = await res.json()
    return data.data?.logs || []
  } catch {
    return []
  }
}

