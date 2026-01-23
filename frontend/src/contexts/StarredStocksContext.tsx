import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

const STARRED_STOCKS_KEY = 'starred_stocks'

interface StarredStocksContextType {
  starredStocks: Set<string>
  toggleStar: (ticker: string) => void
  isStarred: (ticker: string) => boolean
}

const StarredStocksContext = createContext<StarredStocksContextType | undefined>(undefined)

// Initialize state from localStorage synchronously to avoid race condition
function getInitialStarredStocks(): Set<string> {
  try {
    const stored = localStorage.getItem(STARRED_STOCKS_KEY)
    if (stored) {
      const tickers = JSON.parse(stored) as string[]
      return new Set(tickers)
    }
  } catch (error) {
    console.error('Error loading starred stocks:', error)
  }
  return new Set()
}

export function StarredStocksProvider({ children }: { children: ReactNode }) {
  const [starredStocks, setStarredStocks] = useState<Set<string>>(getInitialStarredStocks)
  const [isInitialized, setIsInitialized] = useState(false)

  // Mark as initialized after first render to prevent saving empty set on mount
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Save to localStorage whenever starred stocks change (but not on initial mount)
  useEffect(() => {
    if (!isInitialized) return // Skip saving on initial mount
    
    try {
      const tickers = Array.from(starredStocks)
      localStorage.setItem(STARRED_STOCKS_KEY, JSON.stringify(tickers))
    } catch (error) {
      console.error('Error saving starred stocks:', error)
    }
  }, [starredStocks, isInitialized])

  const toggleStar = useCallback((ticker: string) => {
    setStarredStocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ticker)) {
        newSet.delete(ticker)
      } else {
        newSet.add(ticker)
      }
      return newSet
    })
  }, [])

  const isStarred = useCallback((ticker: string) => {
    return starredStocks.has(ticker)
  }, [starredStocks])

  return (
    <StarredStocksContext.Provider value={{ starredStocks, toggleStar, isStarred }}>
      {children}
    </StarredStocksContext.Provider>
  )
}

export function useStarredStocks() {
  const context = useContext(StarredStocksContext)
  if (context === undefined) {
    throw new Error('useStarredStocks must be used within a StarredStocksProvider')
  }
  return context
}
