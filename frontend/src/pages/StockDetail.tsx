import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStockDetail, getStockChart } from '../services/api'
import type { Stock, ChartResponse } from '../types/stock'
import './StockDetail.css'

const PERIODS = ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const
type Period = typeof PERIODS[number]

// Map our periods to API periods
const PERIOD_MAP: Record<Period, string> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  '3M': '3M',
  '1Y': '1Y',
  '5Y': '5Y',
}

// Color palette for stock logos based on sector
const sectorColors: Record<string, string> = {
  Healthcare: '#3b82f6',
  Technology: '#8b5cf6',
  Finance: '#10b981',
  'Financial Services': '#10b981',
  'Consumer Discretionary': '#f59e0b',
  'Consumer Cyclical': '#f59e0b',
  'Consumer Staples': '#ef4444',
  'Consumer Defensive': '#ef4444',
  Energy: '#f97316',
  Industrials: '#6366f1',
  Communication: '#ec4899',
  'Communication Services': '#ec4899',
  Materials: '#14b8a6',
  'Basic Materials': '#14b8a6',
  Utilities: '#84cc16',
  'Real Estate': '#0ea5e9',
}

function getLogoColor(sector?: string): string {
  return sectorColors[sector || ''] || '#6366f1'
}

function getLogoText(ticker: string): string {
  return ticker.length <= 2 ? ticker : ticker.slice(0, 2)
}

function formatPrice(price?: number | null): string {
  if (price === undefined || price === null) return '-'
  return `$${price.toFixed(2)}`
}

function formatChange(amount?: number | null, percent?: number | null): string {
  if (amount === undefined || amount === null) return '-'
  const sign = amount >= 0 ? '+' : ''
  const percentStr = percent !== undefined && percent !== null ? ` (${sign}${percent.toFixed(2)}%)` : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}${percentStr}`
}

function formatVolume(volume?: number | null): string {
  if (volume === undefined || volume === null) return '-'
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`
  return volume.toString()
}

function getCurrency(exchange?: string): string {
  if (exchange === 'TOR' || exchange === 'TSX') return 'CAD'
  return 'USD'
}

function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()

  const [stock, setStock] = useState<Stock | null>(null)
  const [chartData, setChartData] = useState<ChartResponse | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1D')
  const [isLoading, setIsLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)

  // Fetch stock details
  useEffect(() => {
    if (!ticker) return

    const fetchStock = async () => {
      setIsLoading(true)
      const data = await getStockDetail(ticker)
      setStock(data)
      setIsLoading(false)
    }

    fetchStock()
  }, [ticker])

  // Fetch chart data when period changes
  useEffect(() => {
    if (!ticker) return

    const fetchChart = async () => {
      setChartLoading(true)
      const data = await getStockChart(ticker, PERIOD_MAP[selectedPeriod])
      setChartData(data)
      setChartLoading(false)
    }

    fetchChart()
  }, [ticker, selectedPeriod])

  // Generate SVG path for chart
  const generateChartPath = (): { path: string; isPositive: boolean; openY: number } => {
    if (!chartData?.data_points || chartData.data_points.length < 2) {
      return { path: '', isPositive: true, openY: 50 }
    }

    const prices = chartData.data_points.map(p => p.price)
    const width = 100
    const height = 100
    const padding = 5

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1

    const points = prices.map((price, i) => {
      const x = (i / (prices.length - 1)) * width
      const y = padding + ((max - price) / range) * (height - padding * 2)
      return { x, y }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const isPositive = prices[prices.length - 1] >= prices[0]
    const openY = padding + ((max - prices[0]) / range) * (height - padding * 2)

    return { path: pathD, isPositive, openY }
  }

  const { path: chartPath, isPositive, openY } = generateChartPath()

  if (isLoading) {
    return (
      <div className="stock-detail-page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="stock-detail-page">
        <div className="error">Stock not found</div>
      </div>
    )
  }

  const changeIsPositive = (stock.day_change_percent || 0) >= 0

  return (
    <div className="stock-detail-page">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>W</div>
          <nav className="nav-links">
            <a href="/" className="nav-link">Home</a>
            <a href="#" className="nav-link">Household</a>
            <a href="#" className="nav-link">Move</a>
            <a href="#" className="nav-link">Activity</a>
            <a href="#" className="nav-link">Tax</a>
            <a href="#" className="nav-link">Mortgage</a>
          </nav>
        </div>
        <div className="header-right">
          <span className="header-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="trading-status">Market hours</span>
          <div className="search-bar">
            <span className="search-icon">&#x1F50D;</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search name or symbol"
              onFocus={() => navigate('/stocks')}
            />
            <span className="search-shortcut">/</span>
          </div>
          <span className="header-icon">&#128197;</span>
          <span className="header-icon">&#128100;</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="detail-content">
        {/* Stock Header */}
        <div className="stock-header">
          <div
            className="stock-logo-large"
            style={{ backgroundColor: getLogoColor(stock.sector) }}
          >
            {getLogoText(stock.ticker)}
          </div>
          <div className="stock-title">
            <div className="ticker-row">
              <span className="ticker-symbol">{stock.ticker}</span>
              <span className="star-icon">&#9734;</span>
            </div>
            <span className="company-name">{stock.stock_name}</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="price-section">
          <div className="current-price-row">
            <span className="current-price">{formatPrice(stock.current_price)}</span>
            <span className="currency">{getCurrency(stock.exchange)}</span>
          </div>
          <div className={`price-change ${changeIsPositive ? 'positive' : 'negative'}`}>
            {!changeIsPositive && '-'}
            {formatChange(Math.abs(stock.day_change_amount || 0), stock.day_change_percent)}
            <span className="change-label"> at close</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="chart-section">
          <div className="chart-container">
            {chartLoading ? (
              <div className="chart-loading">Loading chart...</div>
            ) : (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="price-chart">
                {/* Opening price reference line */}
                <line
                  x1="0"
                  y1={openY}
                  x2="100"
                  y2={openY}
                  className="reference-line"
                />
                {/* Price line */}
                <path
                  d={chartPath}
                  className={`chart-line ${isPositive ? 'positive' : 'negative'}`}
                  fill="none"
                />
              </svg>
            )}
          </div>

          {/* Period Selector */}
          <div className="period-selector">
            {PERIODS.map(period => (
              <button
                key={period}
                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Market Details */}
        <section className="details-section">
          <h2 className="section-title">Market details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Open</span>
              <span className="detail-value">{formatPrice(stock.market_open)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bid</span>
              <span className="detail-value">
                {stock.bid_price ? `${formatPrice(stock.bid_price)} x ${stock.bid_size || 100}` : '-'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ask</span>
              <span className="detail-value">
                {stock.ask_price ? `${formatPrice(stock.ask_price)} x ${stock.ask_size || 100}` : '-'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last sale</span>
              <span className="detail-value">
                {formatPrice(stock.current_price)} x 100
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">High</span>
              <span className="detail-value">{formatPrice(stock.market_high)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Low</span>
              <span className="detail-value">{formatPrice(stock.market_low)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Volume</span>
              <span className="detail-value">{formatVolume(stock.volume)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Average volume</span>
              <span className="detail-value">{formatVolume(stock.average_volume)}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">52 week high</span>
              <span className="detail-value">{formatPrice(stock.week_52_high)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">52 week low</span>
              <span className="detail-value">{formatPrice(stock.week_52_low)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Exchange</span>
              <span className="detail-value">{stock.exchange || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Margin requirement</span>
              <span className="detail-value">30.00%</span>
            </div>
          </div>
        </section>

        {/* Financials */}
        <section className="details-section">
          <h2 className="section-title">Financials</h2>
          <div className="details-grid financials-grid">
            <div className="detail-item">
              <span className="detail-label">Market cap</span>
              <span className="detail-value">{stock.market_cap || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Shares outstanding</span>
              <span className="detail-value">{stock.shares_outstanding || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">P/E ratio</span>
              <span className="detail-value">{stock.pe_ratio?.toFixed(2) || '-'}</span>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="details-section">
          <h2 className="section-title">About {stock.ticker}</h2>
          <p className="about-text">
            {stock.description || `${stock.stock_name} is a publicly traded company listed on the ${stock.exchange || 'stock'} exchange.`}
          </p>
        </section>
      </main>
    </div>
  )
}

export default StockDetail
