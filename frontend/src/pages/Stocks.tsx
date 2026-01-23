import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchStocks, getChartsBatch } from '../services/api'
import type { Stock } from '../types/stock'
import NavLinkFalling from '../components/NavLinkFalling'
import StockLogo from '../components/StockLogo'
import StarButton from '../components/StarButton'
import Confetti from 'react-confetti-boom'
import SlotCounter from 'react-slot-counter'
import type { SlotCounterRef } from 'react-slot-counter'
import './Stocks.css'

type ChartData = Record<string, { prices: number[], timestamps: string[] } | null>


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
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0.5, y: 0.1 })
  const [isUserIconAnimating, setIsUserIconAnimating] = useState(false)
  const userIconRef = useRef<SlotCounterRef>(null)
  
  // User icon SVG element
  const userIconSvg = (
    <svg width="20" height="40" viewBox="0 0 24 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="20" r="4"/>
      <path d="M4 32c0-4 4-6 8-6s8 2 8 6"/>
    </svg>
  )
  
  // Dummy characters for slot animation (same icon repeated many times for continuous spin)
  const userIconDummyChars = Array(30).fill(null).map(() => userIconSvg)

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
      {showConfetti && (
        <Confetti 
          mode="boom" 
          particleCount={50}
          x={confettiPosition.x}
          y={confettiPosition.y}
          colors={['#ff577f', '#ff884b', '#ffd384', '#fff9b0', '#ffffff']}
          effectCount={1}
        />
      )}
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M31.9427 0.852018C31.1685 1.22123 30.509 1.76084 29.9355 2.49925C29.362 3.23767 28.7025 4.37369 28.0143 5.87893L21.9642 19H21.4194L16.5161 7.55456L10.724 19H10.0932L3.67025 4.7429C3.15412 3.55008 2.58064 2.66966 1.97849 2.07324C1.37634 1.47683 0.716846 1.07922 0 0.823617V0H9.92115V0.823617C9.54839 0.937219 9.319 1.10762 9.17563 1.33483C9.06093 1.56203 9.00359 1.78924 9.00359 2.04484C9.00359 2.18685 9.03226 2.35725 9.08961 2.55605C9.14695 2.72646 9.2043 2.92526 9.26165 3.09567L12.9892 12.0135L15.914 6.33333L14.595 3.20927C14.1936 2.24365 13.7921 1.64723 13.3907 1.39163C12.9893 1.16442 12.4731 0.96562 11.8423 0.852018V0.0283998H22.0789V0.852018C21.19 0.96562 20.7599 1.50523 20.7599 2.49925C20.7599 2.64126 20.7885 2.86846 20.8459 3.18087C20.9032 3.49327 20.9892 3.77728 21.1326 4.03289L24.2867 11.6158L25.2043 9.6562C25.8925 8.23617 26.3799 7.01495 26.6953 5.96413C27.0108 4.9133 27.1828 4.08969 27.1828 3.46487C27.1828 2.66966 27.0394 2.10164 26.7527 1.70404C26.466 1.30643 25.9498 1.02242 25.2043 0.823617V0H32V0.852018H31.9427Z" fill="#ffffff"/>
            </svg>
          </div>
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
                          <StockLogo stock={stock} size="small" className="result-logo" />
                          <span className="result-ticker">{stock.ticker}</span>
                          <span className="result-name">{stock.stock_name}</span>
                        </div>
                        <StarButton ticker={stock.ticker} className="result-star" />
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
          <button 
            className="icon-btn icon-btn-circle"
            onClick={(e) => {
              if (showConfetti) return // Prevent multiple clicks while animation is playing
              const rect = e.currentTarget.getBoundingClientRect()
              const x = (rect.left + rect.width / 2) / window.innerWidth
              const y = (rect.top + rect.height / 2) / window.innerHeight
              setConfettiPosition({ x, y })
              setShowConfetti(true)
              setTimeout(() => setShowConfetti(false), 3000)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="14" rx="2"/>
              <path d="M12 8V22"/>
              <path d="M3 12h18"/>
              <path d="M12 8c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z"/>
            </svg>
          </button>
          <button 
            className="icon-btn icon-btn-pill user-icon-button"
            onClick={() => {
              if (isUserIconAnimating) return // Prevent multiple clicks while animation is playing
              setIsUserIconAnimating(true)
              setTimeout(() => {
                userIconRef.current?.startAnimation()
              }, 50)
            }}
          >
            <div className="user-icon-slot-container">
              <SlotCounter
                ref={userIconRef}
                startValue={[userIconSvg]}
                value={[userIconSvg]}
                dummyCharacters={userIconDummyChars}
                direction="top-down"
                autoAnimationStart={false}
                animateUnchanged
                duration={1.0}
                speed={1.0}
                onAnimationEnd={() => {
                  setIsUserIconAnimating(false)
                }}
              />
            </div>
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
                      <StockLogo stock={stock} size="small" className="stock-logo" />
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
