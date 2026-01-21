import { useState } from 'react'
import './Home.css'

const sampleResults = [
  { ticker: 'UNH', name: 'UnitedHealth Group Inc', logoClass: 'unh', logoText: 'UHG', starred: false },
  { ticker: 'GEHC', name: 'GE HealthCare Technologies Inc', logoClass: 'gehc', logoText: 'GE', starred: false },
  { ticker: 'PFE', name: 'Pfizer Inc.', logoClass: 'pfe', logoText: 'P', starred: true },
]

function Home() {
  const [searchQuery, setSearchQuery] = useState('')

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
              placeholder="Search name or symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {!showDropdown && <span className="home-search-shortcut">/</span>}
          </div>

          {showDropdown && (
            <div className="search-dropdown">
              <div className="dropdown-section">
                <span className="dropdown-label">Results</span>
                <div className="dropdown-results">
                  {sampleResults.map((result, index) => (
                    <div key={index} className="dropdown-result-item">
                      <div className="result-left">
                        <div className={`result-logo ${result.logoClass}`}>
                          {result.logoText}
                        </div>
                        <span className="result-ticker">{result.ticker}</span>
                        <span className="result-name">{result.name}</span>
                      </div>
                      <span className={`result-star ${result.starred ? 'starred' : ''}`}>
                        {result.starred ? '★' : '☆'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dropdown-footer">
                <a href="/stocks" className="view-all-link">
                  View all results <span className="arrow">→</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
