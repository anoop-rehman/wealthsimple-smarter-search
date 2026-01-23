import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchStocks } from '../services/api'
import type { Stock } from '../types/stock'
import Beams from '../components/Beams'
import NavLinkFalling from '../components/NavLinkFalling'
import StockLogo from '../components/StockLogo'
import StarButton from '../components/StarButton'
import Confetti from 'react-confetti-boom'
import SlotCounter from 'react-slot-counter'
import type { SlotCounterRef } from 'react-slot-counter'
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


const EXAMPLE_PROMPTS = [
  'Healthcare stocks with earnings calls in the next week',
  'Top gaining stocks today',
  'Tech stocks under $100',
  'Energy sector by market cap',
  'Big five Canadian banks',
]

function Home() {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  const debouncedQuery = useDebounce(searchQuery, 300)

  // Auto-focus search bar immediately after "Search" animation completes (4.5s)
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 2250) // Exactly when "Search" fadeIn completes (3s start + 1.5s duration)

    return () => clearTimeout(focusTimer)
  }, [])

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
      {/* Animated background beams */}
      <div className="beams-background">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo logo-home" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M31.9427 0.852018C31.1685 1.22123 30.509 1.76084 29.9355 2.49925C29.362 3.23767 28.7025 4.37369 28.0143 5.87893L21.9642 19H21.4194L16.5161 7.55456L10.724 19H10.0932L3.67025 4.7429C3.15412 3.55008 2.58064 2.66966 1.97849 2.07324C1.37634 1.47683 0.716846 1.07922 0 0.823617V0H9.92115V0.823617C9.54839 0.937219 9.319 1.10762 9.17563 1.33483C9.06093 1.56203 9.00359 1.78924 9.00359 2.04484C9.00359 2.18685 9.03226 2.35725 9.08961 2.55605C9.14695 2.72646 9.2043 2.92526 9.26165 3.09567L12.9892 12.0135L15.914 6.33333L14.595 3.20927C14.1936 2.24365 13.7921 1.64723 13.3907 1.39163C12.9893 1.16442 12.4731 0.96562 11.8423 0.852018V0.0283998H22.0789V0.852018C21.19 0.96562 20.7599 1.50523 20.7599 2.49925C20.7599 2.64126 20.7885 2.86846 20.8459 3.18087C20.9032 3.49327 20.9892 3.77728 21.1326 4.03289L24.2867 11.6158L25.2043 9.6562C25.8925 8.23617 26.3799 7.01495 26.6953 5.96413C27.0108 4.9133 27.1828 4.08969 27.1828 3.46487C27.1828 2.66966 27.0394 2.10164 26.7527 1.70404C26.466 1.30643 25.9498 1.02242 25.2043 0.823617V0H32V0.852018H31.9427Z" fill="#ffffff"/>
            </svg>
          </div>
          <nav className="nav-links">
            <NavLinkFalling text="Home" href="/" active={true} onClick={(e) => { e.preventDefault(); navigate('/'); }} />
            <NavLinkFalling text="Household" href="#" />
            <NavLinkFalling text="Move" href="#" />
            <NavLinkFalling text="Activity" href="#" />
            <NavLinkFalling text="Tax" href="#" />
            <NavLinkFalling text="Mortgage" href="#" />
          </nav>
        </div>
        <div className="header-right">
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

      {/* Centered Search */}
      <div className="home-content">
        {/* Title */}
        <div className="hero-title">
          <span className="hero-intro" style={{
            '--animation-start': '0s',
            '--animation-end': '1.25s',
            '--animation-curve': 'ease-out'
          } as React.CSSProperties}>Introducing a simpler,</span>
          <div className="hero-main">
            <span className="hero-smarter" style={{
              '--animation-start': '1.25s',
              '--animation-end': '1.75s',
              '--animation-curve': 'ease-out'
            } as React.CSSProperties}>Smarter</span>
            <span className="hero-search" style={{
              '--animation-start': '1.75s',
              '--animation-end': '2.25s',
              '--animation-curve': 'ease-out'
            } as React.CSSProperties}>Search</span>
          </div>
        </div>

        <div className="search-container">
          <div className={`home-search-bar ${showDropdown ? 'has-results' : ''}`}>
            <svg className="home-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchInputRef}
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
                        <StockLogo stock={stock} size="small" className="result-logo" />
                        <span className="result-ticker">{stock.ticker}</span>
                        <span className="result-name">{stock.stock_name}</span>
                      </div>
                      <StarButton ticker={stock.ticker} className="result-star" />
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
                onClick={() => navigate(`/stocks?q=${encodeURIComponent(prompt)}`)}
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
