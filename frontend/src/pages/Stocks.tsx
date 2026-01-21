import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchStocks } from '../services/api'
import type { Stock } from '../types/stock'
import './Stocks.css'

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

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMarketCap(cap?: string): string {
  return cap || '-'
}

function formatPrice(price?: number | string): string {
  if (price === undefined || price === null) return '-'
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num)) return '-'
  return `$${num.toFixed(2)}`
}

function formatChange(change?: number | string): string {
  if (change === undefined || change === null) return '-'
  const num = typeof change === 'string' ? parseFloat(change) : change
  if (isNaN(num)) return '-'
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

function MiniChart({ positive }: { positive: boolean }) {
  const path = positive
    ? "M0,18 L10,14 L20,16 L30,10 L40,12 L50,6 L60,8"
    : "M0,6 L10,10 L20,8 L30,14 L40,12 L50,18 L60,16"

  return (
    <svg viewBox="0 0 60 24">
      <path d={path} className={positive ? 'chart-line-green' : 'chart-line-red'} />
    </svg>
  )
}

function Stocks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryFromUrl = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(queryFromUrl)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageTitle, setPageTitle] = useState(queryFromUrl || 'All Stocks')

  // Navbar search state
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [navResults, setNavResults] = useState<Stock[]>([])
  const [navIsLoading, setNavIsLoading] = useState(false)

  const fetchStocks = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      const response = await searchStocks({ query: query || 'all stocks', limit: 50 })
      if (response.success) {
        setStocks(response.results)
        setPageTitle(query || 'All Stocks')
      } else {
        console.error('Search error:', response.error)
        setStocks([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setStocks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch stocks when URL query param changes
  useEffect(() => {
    fetchStocks(queryFromUrl)
  }, [queryFromUrl, fetchStocks])

  // Navbar search with debounce
  useEffect(() => {
    if (!navSearchQuery.trim()) {
      setNavResults([])
      return
    }

    const timer = setTimeout(async () => {
      setNavIsLoading(true)
      try {
        const response = await searchStocks({ query: navSearchQuery, limit: 5 })
        if (response.success) {
          setNavResults(response.results)
        }
      } catch (error) {
        console.error('Navbar search error:', error)
      } finally {
        setNavIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [navSearchQuery])

  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && navSearchQuery.trim()) {
      setSearchParams({ q: navSearchQuery })
      setNavSearchQuery('')
    }
  }

  const showNavDropdown = navSearchQuery.length > 0

  return (
    <div className="stocks-page">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>W</div>
          <nav className="nav-links">
            <a href="/" className="nav-link">Home</a>
            <a href="#" className="nav-link">Move</a>
            <a href="#" className="nav-link">Activity</a>
            <a href="#" className="nav-link">Tax</a>
            <a href="#" className="nav-link">Mortgage</a>
          </nav>
        </div>
        <div className="header-right">
          <div className="navbar-search-container">
            <div className={`search-bar ${showNavDropdown ? 'has-results' : ''}`}>
              <span className="search-icon">&#x1F50D;</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search stocks..."
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                onKeyDown={handleNavKeyDown}
              />
              {!showNavDropdown && <span className="search-shortcut">/</span>}
            </div>

            {showNavDropdown && (
              <div className="navbar-search-dropdown">
                <div className="dropdown-section">
                  <span className="dropdown-label">
                    {navIsLoading ? 'Searching...' : `Results (${navResults.length})`}
                  </span>
                  <div className="dropdown-results">
                    {navResults.map((stock, index) => (
                      <div
                        key={index}
                        className="dropdown-result-item"
                        onClick={() => {
                          setSearchParams({ q: stock.ticker })
                          setNavSearchQuery('')
                        }}
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
                    {!navIsLoading && navResults.length === 0 && (
                      <div className="dropdown-result-item">
                        <span className="result-name">No results found</span>
                      </div>
                    )}
                  </div>
                </div>
                {navResults.length > 0 && (
                  <div className="dropdown-footer">
                    <a
                      href="#"
                      className="view-all-link"
                      onClick={(e) => {
                        e.preventDefault()
                        setSearchParams({ q: navSearchQuery })
                        setNavSearchQuery('')
                      }}
                    >
                      View all results <span className="arrow">→</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="header-icon">&#128197;</span>
          <span className="header-icon">&#128100;</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <h1 className="page-title">{pageTitle}</h1>
        <p className="results-count">
          {isLoading ? 'Loading...' : `${stocks.length} results`}
        </p>

        <table className="stock-table">
          <thead className="table-header">
            <tr>
              <th>Positions</th>
              <th>Earnings call</th>
              <th>Market Cap</th>
              <th>Current price</th>
              <th>1D change %</th>
              <th>1D chart</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => {
              const changePercent = typeof stock.day_change_percent === 'string'
                ? parseFloat(stock.day_change_percent)
                : (stock.day_change_percent || 0)
              const isPositive = changePercent >= 0

              return (
                <tr key={stock.ticker} className="stock-row">
                  <td>
                    <div className="position-cell">
                      <div
                        className="stock-logo"
                        style={{ backgroundColor: getLogoColor(stock.sector) }}
                      >
                        {getLogoText(stock.ticker)}
                      </div>
                      <span className="ticker">{stock.ticker}</span>
                      <span className="company-name">{stock.stock_name}</span>
                    </div>
                  </td>
                  <td>{formatDate(stock.earnings_call_date)}</td>
                  <td>{formatMarketCap(stock.market_cap)}</td>
                  <td>{formatPrice(stock.current_price)}</td>
                  <td className={isPositive ? 'change-positive' : 'change-negative'}>
                    {formatChange(stock.day_change_percent)}
                  </td>
                  <td className="mini-chart">
                    <MiniChart positive={isPositive} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!isLoading && stocks.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
            No stocks found. Try a different search query.
          </p>
        )}
      </main>
    </div>
  )
}

export default Stocks
