import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Stocks from './pages/Stocks'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={<Stocks />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
