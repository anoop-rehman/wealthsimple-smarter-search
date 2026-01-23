import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StarredStocksProvider } from './contexts/StarredStocksContext'
import Home from './pages/Home'
import Stocks from './pages/Stocks'
import StockDetail from './pages/StockDetail'

function App() {
  // Only use basename in production (GitHub Pages)
  const basename = import.meta.env.PROD ? '/wealthsimple-smarter-search' : ''
  
  return (
    <StarredStocksProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
        </Routes>
      </BrowserRouter>
    </StarredStocksProvider>
  )
}

export default App
