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

const EXAMPLE_PROMPTS = [
  'Healthcare stocks with upcoming earnings',
  'Tech stocks under $100',
  'Top gaining stocks today',
  'Energy sector with high volume',
  'Canadian bank stocks',
]

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
          <button className="icon-btn icon-btn-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="14" rx="2"/>
              <path d="M12 8V22"/>
              <path d="M3 12h18"/>
              <path d="M12 8c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z"/>
            </svg>
          </button>
          <button className="icon-btn icon-btn-pill">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Centered Search */}
      <div className="home-content">
        {/* Title */}
        <div className="hero-title">
          <span className="hero-intro">Introducing</span>
          <span className="hero-main">Smarter Search</span>
        </div>

        <div className="search-container">
          <div className={`home-search-bar ${showDropdown ? 'has-results' : ''}`}>
            <svg className="home-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
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

        {/* Prompt Examples */}
        {!showDropdown && (
          <div className="prompt-examples">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                className="prompt-example"
                onClick={() => setSearchQuery(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
