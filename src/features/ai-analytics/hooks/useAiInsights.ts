"use client"

import useSWR from "swr"
import {
  type ForecastResponse,
  type InventoryResponse,
  type MarketBasketResponse,
  type AiEngineHealth,
} from "@/features/ai-analytics/types/ai.types"

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000"

const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`AI Engine error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useAiHealth() {
  const { data, error, isLoading } = useSWR<AiEngineHealth>(
    `${AI_ENGINE_URL}/health`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  )
  return {
    health: data,
    isAiOnline: !!data && data.status === "ok",
    error,
    isLoading,
  }
}

export function useForecast(productId?: string) {
  const { data, error, isLoading } = useSWR<ForecastResponse>(
    [`${AI_ENGINE_URL}/api/insights/forecast`, productId],
    ([url, pid]) =>
      fetcher(url, {
        method: "POST",
        body: JSON.stringify({ productId: pid || null }),
      }),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  )
  return {
    forecast: data?.ml.forecasts || [],
    narrative: data?.narrative,
    error,
    isLoading,
  }
}

export function useInventoryAlerts() {
  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    `${AI_ENGINE_URL}/api/insights/inventory`,
    (url) =>
      fetcher(url, {
        method: "POST",
      }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
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
  const { data, error, isLoading } = useSWR<MarketBasketResponse>(
    [`${AI_ENGINE_URL}/api/insights/market-basket`, productId],
    ([url, pid]) =>
      fetcher(url, {
        method: "POST",
        body: JSON.stringify({ productId: pid || null }),
      }),
    {
      refreshInterval: 120000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
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
  return fetcher(`${AI_ENGINE_URL}/api/train/all`, { method: "GET" })
}
