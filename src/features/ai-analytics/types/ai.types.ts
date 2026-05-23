export interface ForecastPoint {
  date: string
  value: number
  lower: number
  upper: number
}

export interface ProductForecast {
  product_id: string
  product_name: string
  forecast_periods: number
  total_predicted: number
  avg_daily: number
  predictions: ForecastPoint[]
}

export interface InventoryAlert {
  ingredient_id: string
  ingredient_name: string
  unit: string
  current_stock: number
  min_stock: number
  predicted_daily_demand: number
  rop: number
  stock_gap: number
  days_until_stockout: number | null
  stock_ratio: number
  status: "OK" | "WARNING" | "CRITICAL"
  cost: number
  category: string
}

export interface BasketRule {
  antecedents: string[]
  consequents: string[]
  support: number
  confidence: number
  lift: number
}

export interface BasketSuggestion {
  product_id: string
  product_name: string
  confidence: number
  lift: number
}

export interface NarrativeInsight {
  type: "llm" | "fallback"
  mensaje: string
  tipo: string
  timestamp: string
  reason?: string
}

export interface ForecastResponse {
  ml: {
    tipo: "forecast"
    forecasts: ProductForecast[]
    error?: string
  }
  narrative: NarrativeInsight
}

export interface InventoryResponse {
  ml: {
    tipo: "inventory"
    alerts: InventoryAlert[]
  }
  narrative: NarrativeInsight
}

export interface MarketBasketResponse {
  ml: {
    tipo: "market_basket"
    target_product?: string
    target_product_name?: string
    suggestions?: BasketSuggestion[]
    rules?: BasketRule[]
    error?: string
  }
  narrative: NarrativeInsight
}

export interface AiEngineHealth {
  status: string
  service: string
  trained: boolean
  timestamp: number
}
