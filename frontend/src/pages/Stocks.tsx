import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchStocks, getChartsBatch } from '../services/api'
import type { Stock } from '../types/stock'
import NavLinkFalling from '../components/NavLinkFalling'
import './Stocks.css'

type ChartData = Record<string, { prices: number[], timestamps: string[] } | null>

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

function MiniChart({ prices, positive }: { prices?: number[], positive: boolean }) {
  // Generate SVG path from price data
  const generatePath = (prices: number[]): string => {
    if (!prices || prices.length < 2) return ''

    const width = 60
    const height = 24
    const padding = 2

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1

    // Sample ~20 points for smooth mini chart
    const step = Math.max(1, Math.floor(prices.length / 20))
    const sampledPrices = prices.filter((_, i) => i % step === 0)

    const points = sampledPrices.map((price, i) => {
      const x = (i / (sampledPrices.length - 1)) * width
      const y = padding + ((max - price) / range) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    return `M${points.join(' L')}`
  }

  // Fallback path if no data
  const fallbackPath = positive
    ? "M0,18 L10,14 L20,16 L30,10 L40,12 L50,6 L60,8"
    : "M0,6 L10,10 L20,8 L30,14 L40,12 L50,18 L60,16"

  const path = prices && prices.length > 1 ? generatePath(prices) : fallbackPath

  return (
    <svg viewBox="0 0 60 24">
      <path d={path} className={positive ? 'chart-line-green' : 'chart-line-red'} />
    </svg>
  )
}

function Stocks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const queryFromUrl = searchParams.get('q') || ''

  const [, _setSearchQuery] = useState(queryFromUrl)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [chartData, setChartData] = useState<ChartData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [_chartsLoading, setChartsLoading] = useState(false)
  const [pageTitle, setPageTitle] = useState(queryFromUrl || 'All Stocks')

  // Navbar search state
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [navResults, setNavResults] = useState<Stock[]>([])
  const [navIsLoading, setNavIsLoading] = useState(false)

  // Focus search on "/" key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchStocks = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      // For "all stocks" or empty query, don't limit results
      const isAllStocks = !query || query.toLowerCase() === 'all stocks'
      const response = await searchStocks({ 
        query: query || 'all stocks', 
        limit: isAllStocks ? 500 : 50  // 500 for all stocks, 50 for specific queries
      })
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

  // Fetch chart data progressively: first 20 immediately, then rest in batches
  useEffect(() => {
    if (stocks.length === 0) {
      setChartData({})
      return
    }

    let cancelled = false

    const fetchChartsProgressively = async () => {
      setChartsLoading(true)
      const tickers = stocks.map(s => s.ticker)
      const BATCH_SIZE = 20
      
      try {
        // Fetch first batch immediately (visible on page load)
        const firstBatch = tickers.slice(0, BATCH_SIZE)
        const firstResponse = await getChartsBatch(firstBatch, '1D')
        
        if (cancelled) return
        
        if (firstResponse?.charts) {
          setChartData(prev => ({ ...prev, ...firstResponse.charts }))
        }
        
        // Fetch remaining batches progressively
        for (let i = BATCH_SIZE; i < tickers.length; i += BATCH_SIZE) {
          if (cancelled) return
          
          const batch = tickers.slice(i, i + BATCH_SIZE)
          const response = await getChartsBatch(batch, '1D')
          
          if (cancelled) return
          
          if (response?.charts) {
            setChartData(prev => ({ ...prev, ...response.charts }))
          }
        }
      } catch (error) {
        console.error('Error fetching charts:', error)
      } finally {
        if (!cancelled) {
          setChartsLoading(false)
        }
      }
    }

    fetchChartsProgressively()
    
    return () => {
      cancelled = true
    }
  }, [stocks])

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
            <NavLinkFalling text="Home" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} />
            <NavLinkFalling text="Household" href="#" />
            <NavLinkFalling text="Move" href="#" />
            <NavLinkFalling text="Activity" href="#" />
            <NavLinkFalling text="Tax" href="#" />
            <NavLinkFalling text="Mortgage" href="#" />
          </nav>
        </div>
        <div className="header-right">
          <div className="navbar-search-container">
            <div className={`search-bar ${showNavDropdown ? 'has-results' : ''}`}>
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
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
                    {navResults.map((stock) => (
                      <div
                        key={`nav-${stock.ticker}`}
                        className="dropdown-result-item"
                        onClick={() => {
                          navigate(`/stock/${stock.ticker}`)
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
            {stocks.map((stock) => {
              const changePercent = typeof stock.day_change_percent === 'string'
                ? parseFloat(stock.day_change_percent)
                : (stock.day_change_percent || 0)
              const isPositive = changePercent >= 0

              return (
                <tr
                  key={stock.ticker}
                  className="stock-row"
                  onClick={() => navigate(`/stock/${stock.ticker}`)}
                  style={{ cursor: 'pointer' }}
                >
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
                    <MiniChart
                      prices={chartData[stock.ticker]?.prices}
                      positive={isPositive}
                    />
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
