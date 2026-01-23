import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStockDetail, getStockChart, searchStocks } from '../services/api'
import type { Stock, ChartResponse } from '../types/stock'
import SlotCounter from 'react-slot-counter'
import type { SlotCounterRef } from 'react-slot-counter'
import NavLinkFalling from '../components/NavLinkFalling'
import Confetti from 'react-confetti-boom'
import './StockDetail.css'
const PERIODS = ['1D', '1W', '1M', '3M', '1Y', '5Y', '10Y'] as const
type Period = typeof PERIODS[number]
// Map our periods to API periods
const PERIOD_MAP: Record<Period, string> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  '3M': '3M',
  '1Y': '1Y',
  '5Y': '5Y',
  '10Y': '10Y',
}
interface HoverData {
  index: number
  price: number
  timestamp: string
  x: number
  y: number
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
function formatTimestamp(timestamp: string, period: Period): string {
  const date = new Date(timestamp)
  if (period === '1D' || period === '1W') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).replace(',', '')
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const chartRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [stock, setStock] = useState<Stock | null>(null)
  const [chartData, setChartData] = useState<ChartResponse | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1D')
  const [isLoading, setIsLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [hoverData, setHoverData] = useState<HoverData | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<HoverData | null>(null)
  // Animation state - only used when animating from hover price to current price
  const [isSlotAnimating, setIsSlotAnimating] = useState(false)
  const [animationStartInt, setAnimationStartInt] = useState<string>('')
  const [animationEndInt, setAnimationEndInt] = useState<string>('')
  const [animationStartDecimal, setAnimationStartDecimal] = useState<string>('')
  const [animationEndDecimal, setAnimationEndDecimal] = useState<string>('')
  const [hasInitialAnimation, setHasInitialAnimation] = useState(false)
  const [shouldAnimateChart, setShouldAnimateChart] = useState(true)
  const lastHoveredPriceRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  const slotCounterRef = useRef<SlotCounterRef>(null)
  const decimalSlotCounterRef = useRef<SlotCounterRef>(null)
  // Navbar search state
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [navResults, setNavResults] = useState<Stock[]>([])
  const [navIsLoading, setNavIsLoading] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0.5, y: 0.1 })
  const [isUserIconAnimating, setIsUserIconAnimating] = useState(false)
  const userIconRef = useRef<SlotCounterRef>(null)
  
  // User icon SVG element
  const userIconSvg = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
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
      navigate(`/stocks?q=${encodeURIComponent(navSearchQuery)}`)
      setNavSearchQuery('')
    }
  }
  const showNavDropdown = navSearchQuery.length > 0
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

  // Trigger chart animation when period changes
  useEffect(() => {
    setShouldAnimateChart(true)
    const timer = setTimeout(() => {
      setShouldAnimateChart(false)
    }, 850) // Slightly longer than animation duration (800ms)
    return () => clearTimeout(timer)
  }, [selectedPeriod])

  // Trigger animation when SlotCounter is ready
  useEffect(() => {
    if (isSlotAnimating && animationStartInt && animationEndInt && slotCounterRef.current && decimalSlotCounterRef.current) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        slotCounterRef.current?.startAnimation()
        decimalSlotCounterRef.current?.startAnimation()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isSlotAnimating]) // eslint-disable-line react-hooks/exhaustive-deps
  // Generate smooth Catmull-Rom spline path through points
  const generateSmoothPath = useCallback((points: { x: number; y: number }[], tension: number = 0.5): string => {
    if (points.length < 2) return ''
    if (points.length === 2) {
      return `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`
    }

    let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2]

      // Catmull-Rom to Cubic Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) * tension / 6
      const cp1y = p1.y + (p2.y - p0.y) * tension / 6
      const cp2x = p2.x - (p3.x - p1.x) * tension / 6
      const cp2y = p2.y - (p3.y - p1.y) * tension / 6

      path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
    }

    return path
  }, [])

  // Downsample data points based on period
  const downsampleData = useCallback((dataPoints: ChartResponse['data_points'], period: Period) => {
    if (!dataPoints || dataPoints.length < 2) return dataPoints
    
    if (period === '1W') {
      // 1W data is 15-min intervals, sample every 2nd point for ~30 min intervals
      return dataPoints.filter((_, i) => i % 2 === 0 || i === dataPoints.length - 1)
    }
    
    if (period === '1M') {
      // Keep only the last data point of each day
      const dailyPoints: ChartResponse['data_points'] = []
      let currentDay = ''
      
      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i]
        const day = point.timestamp.split('T')[0]
        
        if (day !== currentDay) {
          // New day - if we have a previous day, the last point added is correct
          currentDay = day
        }
        
        // Always update to latest point of the day
        if (dailyPoints.length === 0 || dailyPoints[dailyPoints.length - 1].timestamp.split('T')[0] !== day) {
          dailyPoints.push(point)
        } else {
          dailyPoints[dailyPoints.length - 1] = point
        }
      }
      
      return dailyPoints
    }
    
    if (period === '10Y') {
      // Keep only the last data point of each month (weekly data downsampled to monthly)
      const monthlyPoints: ChartResponse['data_points'] = []
      
      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i]
        const date = new Date(point.timestamp)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        // Get the last point's month for comparison
        const lastPointMonth = monthlyPoints.length > 0 
          ? (() => {
              const lastDate = new Date(monthlyPoints[monthlyPoints.length - 1].timestamp)
              return `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`
            })()
          : null
        
        // Always update to latest point of the month
        if (monthlyPoints.length === 0 || lastPointMonth !== month) {
          monthlyPoints.push(point)
        } else {
          monthlyPoints[monthlyPoints.length - 1] = point
        }
      }
      
      return monthlyPoints
    }
    
    return dataPoints
  }, [])

  // Generate SVG path and points for chart
  const generateChartData = useCallback(() => {
    if (!chartData?.data_points || chartData.data_points.length < 2) {
      return { path: '', isPositive: true, openY: 50, points: [], min: 0, max: 0, range: 1 }
    }
    
    // Full data for hover interactions
    const allPrices = chartData.data_points.map(p => p.price)
    const width = 100
    const height = 100
    const padding = 5
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    const range = max - min || 1
    
    // Full points array for hover (maps to all data points)
    const points = allPrices.map((price, i) => {
      const x = (i / (allPrices.length - 1)) * width
      const y = padding + ((max - price) / range) * (height - padding * 2)
      return { x, y, price }
    })
    
    // Downsampled data for path drawing (smoother appearance)
    const downsampledData = downsampleData(chartData.data_points, selectedPeriod)
    const downsampledPrices = downsampledData.map(p => p.price)
    const pathPoints = downsampledPrices.map((price, i) => {
      const x = (i / (downsampledPrices.length - 1)) * width
      const y = padding + ((max - price) / range) * (height - padding * 2)
      return { x, y, price }
    })
    
    // Use smooth curves for 1W and longer periods
    const useSmoothing = selectedPeriod !== '1D'
    const pathD = useSmoothing 
      ? generateSmoothPath(pathPoints)
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    
    const isPositive = allPrices[allPrices.length - 1] >= allPrices[0]
    const openY = padding + ((max - allPrices[0]) / range) * (height - padding * 2)
    
    // Create area path (closed shape for gradient fill)
    const areaPathD = pathD + ` L${width},${height} L0,${height} Z`
    
    return { path: pathD, areaPath: areaPathD, isPositive, openY, points, min, max, range }
  }, [chartData, selectedPeriod, generateSmoothPath, downsampleData])
  const { path: chartPath, areaPath: chartAreaPath, isPositive, openY, points: chartPoints } = generateChartData()
  // Handle mouse move on chart
  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !chartData?.data_points || chartData.data_points.length < 2) return
    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const relativeX = x / rect.width
    // Find the closest data point
    const index = Math.min(
      Math.max(0, Math.round(relativeX * (chartData.data_points.length - 1))),
      chartData.data_points.length - 1
    )
    const dataPoint = chartData.data_points[index]
    const point = chartPoints[index]
    if (dataPoint && point) {
      setHoverData({
        index,
        price: dataPoint.price,
        timestamp: dataPoint.timestamp,
        x: point.x,
        y: point.y
      })
      // Store hovered price for animation when leaving
      if (!isAnimatingRef.current) {
        lastHoveredPriceRef.current = dataPoint.price
      }
    }
  }, [chartData, chartPoints])
  const handleChartMouseLeave = useCallback(() => {
    const lastPrice = lastHoveredPriceRef.current
    // Trigger animation if we have a last hovered price and it's different from current
    if (lastPrice !== null && stock?.current_price && !isAnimatingRef.current) {
      const startInt = Math.floor(lastPrice).toString()
      const endInt = Math.floor(stock.current_price).toString()
      const startDecimal = lastPrice.toFixed(2).split('.')[1]
      const endDecimal = stock.current_price.toFixed(2).split('.')[1]
      // Only animate if values are different
      if (startInt !== endInt || startDecimal !== endDecimal) {
        // Set animation values
        setAnimationStartInt(startInt)
        setAnimationEndInt(endInt)
        setAnimationStartDecimal(startDecimal)
        setAnimationEndDecimal(endDecimal)
        // Mark as animating
        isAnimatingRef.current = true
          setIsSlotAnimating(true)
    }
    }
    // Clear state
    setHoverData(null)
    lastHoveredPriceRef.current = null
    if (isDragging) {
      setIsDragging(false)
      setDragStart(null)
    }
  }, [isDragging, stock?.current_price])
  // Handle mouse down to start drag selection
  const handleChartMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!chartRef.current || !chartData?.data_points || chartData.data_points.length < 2) return
    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const relativeX = x / rect.width
    const index = Math.min(
      Math.max(0, Math.round(relativeX * (chartData.data_points.length - 1))),
      chartData.data_points.length - 1
    )
    const dataPoint = chartData.data_points[index]
    const point = chartPoints[index]
    if (dataPoint && point) {
      setIsDragging(true)
      setDragStart({
        index,
        price: dataPoint.price,
        timestamp: dataPoint.timestamp,
        x: point.x,
        y: point.y
      })
    }
  }, [chartData, chartPoints])
  // Global mouseup listener - clear drag state on release (selection disappears)
  useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging])
  // Compute active selection - only exists while dragging
  const activeSelection = useMemo(() => {
    if (!isDragging || !dragStart || !hoverData || Math.abs(dragStart.index - hoverData.index) < 1) {
      return null
    }
    const startIdx = Math.min(dragStart.index, hoverData.index)
    const endIdx = Math.max(dragStart.index, hoverData.index)
    const startPoint = chartPoints[startIdx]
    const endPoint = chartPoints[endIdx]
    const startData = chartData?.data_points?.[startIdx]
    const endData = chartData?.data_points?.[endIdx]
    if (startPoint && endPoint && startData && endData) {
      return {
        startIndex: startIdx,
        endIndex: endIdx,
        startPrice: startData.price,
        endPrice: endData.price,
        startTimestamp: startData.timestamp,
        endTimestamp: endData.timestamp,
        startX: startPoint.x,
        endX: endPoint.x,
        startY: startPoint.y,
        endY: endPoint.y
      }
    }
    return null
  }, [isDragging, dragStart, hoverData, chartPoints, chartData])
  // Calculate displayed price and change
  // If drag selection exists, use selection range; if hovering, use hover point; else use current price
  const displayPrice = activeSelection
    ? activeSelection.endPrice
    : (hoverData?.price ?? stock?.current_price)
  const baselinePrice = activeSelection
    ? activeSelection.startPrice
    : (chartData?.data_points?.[0]?.price ?? stock?.closing_price ?? 0)
  const displayChangeAmount = displayPrice && baselinePrice ? displayPrice - baselinePrice : stock?.day_change_amount
  const displayChangePercent = displayPrice && baselinePrice && baselinePrice !== 0
    ? ((displayPrice - baselinePrice) / baselinePrice) * 100
    : stock?.day_change_percent
  // Determine if selection/hover is positive
  const selectionIsPositive = activeSelection
    ? activeSelection.endPrice >= activeSelection.startPrice
    : (hoverData ? (hoverData.price >= baselinePrice) : isPositive)
  // Generate paths for before/after cursor
  const generateSplitPaths = useCallback(() => {
    if (!hoverData || chartPoints.length < 2) {
      return { beforePath: chartPath, afterPath: '' }
    }
    const beforePoints = chartPoints.slice(0, hoverData.index + 1)
    const afterPoints = chartPoints.slice(hoverData.index)
    const beforePath = beforePoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    ).join(' ')
    const afterPath = afterPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    ).join(' ')
    return { beforePath, afterPath }
  }, [hoverData, chartPoints, chartPath])
  const { beforePath, afterPath } = generateSplitPaths()
  // Generate paths for selection visualization
  const generateSelectionPaths = useCallback(() => {
    if (!activeSelection || chartPoints.length < 2) {
      return { beforeSelectionPath: '', selectionPath: '', afterSelectionPath: '' }
    }
    const beforePoints = chartPoints.slice(0, activeSelection.startIndex + 1)
    const selectionPoints = chartPoints.slice(activeSelection.startIndex, activeSelection.endIndex + 1)
    const afterPoints = chartPoints.slice(activeSelection.endIndex)
    const beforeSelectionPath = beforePoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    ).join(' ')
    const selectionPath = selectionPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    ).join(' ')
    const afterSelectionPath = afterPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    ).join(' ')
    return { beforeSelectionPath, selectionPath, afterSelectionPath }
  }, [activeSelection, chartPoints])
  const { beforeSelectionPath, selectionPath, afterSelectionPath } = generateSelectionPaths()
  // Format timestamp range for selection
  const formatSelectionTimestamp = () => {
    if (!activeSelection) return ''
    const startDate = new Date(activeSelection.startTimestamp)
    const endDate = new Date(activeSelection.endTimestamp)
    const startStr = startDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const endStr = endDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    })
    return `${startStr} - ${endStr}`
  }
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
  const changeIsPositive = activeSelection ? selectionIsPositive : (displayChangePercent || 0) >= 0
  return (
    <div className="stock-detail-page">
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
                    {navResults.map((result, index) => (
                      <div
                        key={index}
                        className="dropdown-result-item"
                        onClick={() => {
                          navigate(`/stock/${result.ticker}`)
                          setNavSearchQuery('')
                        }}
                      >
                        <div className="result-left">
                          <div
                            className="result-logo"
                            style={{ backgroundColor: getLogoColor(result.sector) }}
                          >
                            {getLogoText(result.ticker)}
                          </div>
                          <span className="result-ticker">{result.ticker}</span>
                          <span className="result-name">{result.stock_name}</span>
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
                        navigate(`/stocks?q=${encodeURIComponent(navSearchQuery)}`)
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
                duration={1.5}
                speed={20}
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
            {isSlotAnimating || (stock?.current_price && !hasInitialAnimation) ? (
              <div className="current-price">
                <span className="price-char">$</span>
                <SlotCounter
                  ref={slotCounterRef}
                  startValue={isSlotAnimating ? animationStartInt : '0'}
                  value={isSlotAnimating ? animationEndInt : (stock?.current_price ? Math.floor(stock.current_price).toString() : '0')}
                  sequentialAnimationMode
                  direction="bottom-up"
                  autoAnimationStart={false}
                  animateOnVisible={!isSlotAnimating}
                  onAnimationEnd={() => {
                    if (isSlotAnimating) {
                      isAnimatingRef.current = false
                    setIsSlotAnimating(false)
                    } else {
                      setHasInitialAnimation(true)
                    }
                  }}
                />
                <span className="price-char">.</span>
                <SlotCounter
                  ref={decimalSlotCounterRef}
                  startValue={isSlotAnimating ? animationStartDecimal : '00'}
                  value={isSlotAnimating ? animationEndDecimal : (stock?.current_price ? stock.current_price.toFixed(2).split('.')[1] : '00')}
                  sequentialAnimationMode
                  direction="bottom-up"
                  autoAnimationStart={false}
                  animateOnVisible={!isSlotAnimating}
                />
              </div>
            ) : (
              <div className="current-price">
                <span className="price-char">$</span>
                {displayPrice !== undefined && displayPrice !== null && (
                  <>
                    {Math.floor(displayPrice).toString().split('').map((digit, i) => (
                      <span key={`int-${i}`} className="price-digit">{digit}</span>
                    ))}
                    <span className="price-char">.</span>
                    {displayPrice.toFixed(2).split('.')[1].split('').map((digit, i) => (
                      <span key={`dec-${i}`} className="price-digit">{digit}</span>
                    ))}
                  </>
                )}
              </div>
            )}
            <span className="currency">{getCurrency(stock.exchange)}</span>
          </div>
          <div className={`price-change ${changeIsPositive ? 'positive' : 'negative'}`}>
            {!changeIsPositive && '-'}
            {formatChange(Math.abs(displayChangeAmount || 0), displayChangePercent)}
            {!hoverData && <span className="change-label"> at close</span>}
          </div>
        </div>
        {/* Chart Section */}
        <div className="chart-section">
          <div
            className="chart-container"
            ref={chartRef}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
            onMouseDown={handleChartMouseDown}
          >
            {chartLoading ? (
              <div className="chart-loading">Loading chart...</div>
            ) : (
              <>
                {/* Timestamp label - shows selection range or hover time */}
                {activeSelection ? (
                  <div
                    className="hover-timestamp selection-timestamp"
                    style={{ left: `${(activeSelection.startX + activeSelection.endX) / 2}%` }}
                  >
                    {formatSelectionTimestamp()}
                  </div>
                ) : hoverData && (
                  <div
                    className="hover-timestamp"
                    style={{ left: `${hoverData.x}%` }}
                  >
                    {formatTimestamp(hoverData.timestamp, selectedPeriod)}
                  </div>
                )}
                {/* Selection dots */}
                {activeSelection && (
                  <>
                    <div
                      className={`cursor-dot-html ${selectionIsPositive ? 'positive' : 'negative'}`}
                      style={{
                        left: `${activeSelection.startX}%`,
                        top: `${activeSelection.startY}%`
                      }}
                    />
                    <div
                      className={`cursor-dot-html ${selectionIsPositive ? 'positive' : 'negative'}`}
                      style={{
                        left: `${activeSelection.endX}%`,
                        top: `${activeSelection.endY}%`
                      }}
                    />
                  </>
                )}
                {/* Cursor dot - rendered as HTML for proper circle shape (only when not in selection mode) */}
                {hoverData && !activeSelection && (
                  <div
                    className={`cursor-dot-html ${isPositive ? 'positive' : 'negative'}`}
                    style={{
                      left: `${hoverData.x}%`,
                      top: `${hoverData.y}%`
                    }}
                  />
                )}
                {/* Price label on right - only shows on hover/selection, positioned at baseline */}
                {(hoverData || activeSelection) && (
                  <div
                    className="price-label"
                    style={{ top: `${openY}%` }}
                  >
                    {formatPrice(stock.closing_price)}
                  </div>
                )}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="price-chart">
                  {/* Gradient definitions for area fill */}
                  <defs>
                    <linearGradient id="areaGradientPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="areaGradientNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e07862" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#e07862" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Opening price reference line */}
                  <line
                    x1="0"
                    y1={openY}
                    x2="100"
                    y2={openY}
                    className="reference-line"
                  />
                  {/* Chart rendering based on mode: selection, hover, or default */}
                  {activeSelection ? (
                    <>
                      {/* Before selection - faded */}
                      <path
                        d={beforeSelectionPath}
                        className="chart-line faded"
                        fill="none"
                      />
                      {/* Selection portion - highlighted in green/red */}
                      <path
                        d={selectionPath}
                        className={`chart-line ${selectionIsPositive ? 'positive' : 'negative'}`}
                        fill="none"
                      />
                      {/* After selection - faded */}
                      <path
                        d={afterSelectionPath}
                        className="chart-line faded"
                        fill="none"
                      />
                      {/* Selection boundary lines */}
                      <line
                        x1={activeSelection.startX}
                        y1="0"
                        x2={activeSelection.startX}
                        y2="100"
                        className="cursor-line"
                      />
                      <line
                        x1={activeSelection.endX}
                        y1="0"
                        x2={activeSelection.endX}
                        y2="100"
                        className="cursor-line"
                      />
                    </>
                  ) : hoverData ? (
                    <>
                      <path
                        d={beforePath}
                        className={`chart-line ${isPositive ? 'positive' : 'negative'}`}
                        fill="none"
                      />
                      <path
                        d={afterPath}
                        className={`chart-line faded ${isPositive ? 'positive' : 'negative'}`}
                        fill="none"
                      />
                      {/* Cursor line */}
                      <line
                        x1={hoverData.x}
                        y1="0"
                        x2={hoverData.x}
                        y2="100"
                        className="cursor-line"
                      />
                    </>
                  ) : (
                    <>
                      {/* Area fill with gradient */}
                      <path
                        key={`area-${selectedPeriod}`}
                        d={chartAreaPath}
                        fill={isPositive ? 'url(#areaGradientPositive)' : 'url(#areaGradientNegative)'}
                        className={shouldAnimateChart ? 'chart-area animate' : 'chart-area'}
                      />
                      {/* Chart line */}
                      <path
                        key={`chart-${selectedPeriod}`}
                        d={chartPath}
                        className={`chart-line ${shouldAnimateChart ? 'animate' : ''} ${isPositive ? 'positive' : 'negative'}`}
                        fill="none"
                      />
                    </>
                  )}
                </svg>
              </>
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
          <div className="about-text-container">
          <p className="about-text">
              {(() => {
                const description = stock.description || `${stock.stock_name} is a publicly traded company listed on the ${stock.exchange || 'stock'} exchange.`
                const maxLength = 500
                if (description.length <= maxLength || showFullDescription) {
                  return description
                }
                return (
                  <>
                    {description.slice(0, maxLength)}
                    {'... '}
                    <button
                      className="show-more-link"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowFullDescription(true)
                      }}
                    >
                      Show more
                    </button>
                  </>
                )
              })()}
          </p>
            {stock.description && stock.description.length > 500 && showFullDescription && (
              <button
                className="show-more-link"
                onClick={(e) => {
                  e.preventDefault()
                  setShowFullDescription(false)
                }}
              >
                Show less
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
export default StockDetail
