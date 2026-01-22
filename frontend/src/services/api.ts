import type { SearchResponse, SearchRequest, ChartResponse, ChartBatchResponse, Stock } from '../types/stock'

// Only use localhost in development, not in production
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
const API_BASE_URL = import.meta.env.VITE_API_URL || (isDevelopment ? 'http://localhost:8000' : '')

// Log API URL in development for debugging
if (isDevelopment) {
  console.log('API_BASE_URL:', API_BASE_URL || 'NOT SET - API calls will fail')
}

export async function searchStocks(request: SearchRequest): Promise<SearchResponse> {
  if (!API_BASE_URL) {
    const error = 'API URL not configured. Set VITE_API_URL environment variable.'
    console.error(error)
    return {
      success: false,
      results: [],
      result_count: 0,
      error,
    }
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: request.query,
        limit: request.limit || 50,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Search API error:', error)
    return {
      success: false,
      results: [],
      result_count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function searchStocksGet(query: string, limit: number = 50): Promise<SearchResponse> {
  if (!API_BASE_URL) {
    return {
      success: false,
      results: [],
      result_count: 0,
      error: 'API URL not configured',
    }
  }
  try {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    })

    const response = await fetch(`${API_BASE_URL}/api/v1/search?${params}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Search API error:', error)
    return {
      success: false,
      results: [],
      result_count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Chart API functions

export async function getStockChart(ticker: string, period: string = '1D'): Promise<ChartResponse | null> {
  if (!API_BASE_URL) {
    return null
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/stocks/${ticker}/chart?period=${period}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Chart API error for ${ticker}:`, error)
    return null
  }
}

export async function getChartsBatch(tickers: string[], period: string = '1D'): Promise<ChartBatchResponse | null> {
  if (!API_BASE_URL) {
    return null
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/stocks/charts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickers, period }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Charts batch API error:', error)
    return null
  }
}

// Stock detail API

export async function getStockDetail(ticker: string): Promise<Stock | null> {
  if (!API_BASE_URL) {
    return null
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/stocks/${ticker}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Stock detail API error for ${ticker}:`, error)
    return null
  }
}
