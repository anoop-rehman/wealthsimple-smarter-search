import type { SearchResponse, SearchRequest, ChartResponse, ChartBatchResponse, Stock } from '../types/stock'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function searchStocks(request: SearchRequest): Promise<SearchResponse> {
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
