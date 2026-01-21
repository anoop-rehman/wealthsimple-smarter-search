import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Stocks from './pages/Stocks'
import StockDetail from './pages/StockDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/stock/:ticker" element={<StockDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
