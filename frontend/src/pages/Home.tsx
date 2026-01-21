import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchStocks } from '../services/api'
import type { Stock } from '../types/stock'
import './Home.css'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Color palette for stock logos based on sector
const sectorColors: Record<string, string> = {
  Healthcare: '#3b82f6',
  Technology: '#8b5cf6',
  Finance: '#10b981',
  'Consumer Discretionary': '#f59e0b',
  'Consumer Staples': '#ef4444',
  Energy: '#f97316',
  Industrials: '#6366f1',
  Communication: '#ec4899',
  Materials: '#14b8a6',
  Utilities: '#84cc16',
}

function getLogoColor(sector?: string): string {
  return sectorColors[sector || ''] || '#6366f1'
}

function getLogoText(ticker: string): string {
  return ticker.length <= 2 ? ticker : ticker.slice(0, 2)
}

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 300)

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await searchStocks({ query, limit: 5 })
      if (response.success) {
        setResults(response.results)
      } else {
        console.error('Search error:', response.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResults(debouncedQuery)
  }, [debouncedQuery, fetchResults])

  const handleViewAll = () => {
    if (searchQuery.trim()) {
      navigate(`/stocks?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/stocks?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const showDropdown = searchQuery.length > 0

  return (
    <div className="home">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">W</div>
          <nav className="nav-links">
            <a href="/" className="nav-link active">Home</a>
            <a href="#" className="nav-link">Move</a>
            <a href="#" className="nav-link">Activity</a>
            <a href="#" className="nav-link">Tax</a>
            <a href="#" className="nav-link">Mortgage</a>
          </nav>
        </div>
        <div className="header-right">
          <span className="header-icon">&#128197;</span>
          <span className="header-icon">&#128100;</span>
        </div>
      </header>

      {/* Centered Search */}
      <div className="home-content">
        <div className="search-container">
          <div className={`home-search-bar ${showDropdown ? 'has-results' : ''}`}>
            <span className="home-search-icon">&#x1F50D;</span>
            <input
              type="text"
              className="home-search-input"
              placeholder="Search stocks using natural language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {!showDropdown && <span className="home-search-shortcut">/</span>}
          </div>

          {showDropdown && (
            <div className="search-dropdown">
              <div className="dropdown-section">
                <span className="dropdown-label">
                  {isLoading ? 'Searching...' : `Results (${results.length})`}
                </span>
                <div className="dropdown-results">
                  {results.map((stock, index) => (
                    <div
                      key={index}
                      className="dropdown-result-item"
                      onClick={() => navigate(`/stock/${stock.ticker}`)}
                    >
                      <div className="result-left">
                        <div
                          className="result-logo"
                          style={{ backgroundColor: getLogoColor(stock.sector) }}
                        >
                          {getLogoText(stock.ticker)}
                        </div>
                        <span className="result-ticker">{stock.ticker}</span>
                        <span className="result-name">{stock.stock_name}</span>
                      </div>
                      <span className="result-star">☆</span>
                    </div>
                  ))}
                  {!isLoading && results.length === 0 && (
                    <div className="dropdown-result-item">
                      <span className="result-name">No results found</span>
                    </div>
                  )}
                </div>
              </div>
              {results.length > 0 && (
                <div className="dropdown-footer">
                  <a href="#" className="view-all-link" onClick={(e) => { e.preventDefault(); handleViewAll(); }}>
                    View all results <span className="arrow">→</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
