import './Home.css'

function Home() {
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
        <div className="home-search-bar">
          <span className="home-search-icon">&#x1F50D;</span>
          <input
            type="text"
            className="home-search-input"
            placeholder="Search name or symbol"
            readOnly
          />
          <span className="home-search-shortcut">/</span>
        </div>
      </div>
    </div>
  )
}

export default Home
