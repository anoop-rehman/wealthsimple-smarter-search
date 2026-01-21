import type { SearchResponse, SearchRequest } from '../types/stock'

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
