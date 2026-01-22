import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Stocks from './pages/Stocks'
import StockDetail from './pages/StockDetail'

function App() {
  // Only use basename in production (GitHub Pages)
  const basename = import.meta.env.PROD ? '/wealthsimple-ai-command-center' : ''
  
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/stock/:ticker" element={<StockDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
