import './App.css'

const stockData = [
  { ticker: 'UNH', name: 'Unitedhealth Group Inc', earningsCall: 'Jul 21', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'unh', logoText: 'UHC', selected: false, faded: false },
  { ticker: 'GEHC', name: 'GE HealthCare Technologies Inc', earningsCall: 'Jul 24', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'gehc', logoText: 'GE', selected: true, faded: false },
  { ticker: 'PFE', name: 'Pfizer Inc.', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'pfe', logoText: 'P', selected: false, faded: false },
  { ticker: 'KALE', name: 'Kale, Inc.', earningsCall: 'Jul 21', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'kale', logoText: 'KALE', selected: false, faded: false },
  { ticker: 'GOOGL', name: 'Alphabet Inc', earningsCall: 'Jul 24', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'googl', logoText: 'G', selected: false, faded: false },
  { ticker: 'TCEHY', name: 'Tencent Holdings Ltd.', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'tcehy', logoText: 'T', selected: false, faded: false },
  { ticker: 'XX', name: 'ETF name', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'placeholder', logoText: '', selected: false, faded: true },
  { ticker: 'XX', name: 'ETF name', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'placeholder', logoText: '', selected: false, faded: true },
  { ticker: 'XX', name: 'ETF name', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'placeholder', logoText: '', selected: false, faded: true },
  { ticker: 'XX', name: 'ETF name', earningsCall: 'Jul 27', marketCap: '$2.23B', price: '$56.02', change: '-1.02%', logoClass: 'placeholder', logoText: '', selected: false, faded: true },
]

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

function App() {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">W</div>
          <nav className="nav-links">
            <a href="#" className="nav-link active">Home</a>
            <a href="#" className="nav-link">Move</a>
            <a href="#" className="nav-link">Activity</a>
            <a href="#" className="nav-link">Tax</a>
            <a href="#" className="nav-link">Mortgage</a>
          </nav>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <span className="search-icon">&#x1F50D;</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search name or symbol"
              readOnly
            />
            <span className="search-shortcut">/</span>
          </div>
          <span className="header-icon">&#128197;</span>
          <span className="header-icon">&#128100;</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <h1 className="page-title">Healthcare stocks with earnings calls in the next week</h1>
        <p className="results-count">24 results</p>

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
            {stockData.map((stock, index) => (
              <tr
                key={index}
                className={`stock-row ${stock.selected ? 'selected' : ''} ${stock.faded ? 'faded' : ''}`}
              >
                <td>
                  <div className="position-cell">
                    <div className={`stock-logo ${stock.logoClass}`}>
                      {stock.logoText}
                    </div>
                    <span className="ticker">{stock.ticker}</span>
                    <span className="company-name">{stock.name}</span>
                  </div>
                </td>
                <td>{stock.earningsCall}</td>
                <td>{stock.marketCap}</td>
                <td>{stock.price}</td>
                <td className="change-negative">{stock.change}</td>
                <td className="mini-chart">
                  <MiniChart positive={index % 2 === 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}

export default App
