export interface Stock {
  ticker: string
  stock_name: string
  description?: string
  sector?: string
  industry?: string
  current_price?: number
  closing_price?: number
  day_change_amount?: number
  day_change_percent?: number
  market_open?: number
  market_high?: number
  market_low?: number
  week_52_high?: number
  week_52_low?: number
  bid_price?: number
  bid_size?: number
  ask_price?: number
  ask_size?: number
  last_sale_price?: number
  last_sale_size?: number
  volume?: number
  average_volume?: number
  exchange?: string
  margin_requirement?: string
  dividend_frequency?: string
  dividend_yield_12month?: string
  ex_dividend_date?: string
  market_cap?: string
  market_cap_numeric?: number
  shares_outstanding?: string
  pe_ratio?: number
  earnings_call_date?: string
}

export interface SearchResponse {
  success: boolean
  results: Stock[]
  result_count: number
  generated_sql?: string
  error?: string
}

export interface SearchRequest {
  query: string
  limit?: number
}
