import { useState } from 'react'
import type { Stock } from '../types/stock'
import { getLogoUrl, getLogoColor, getLogoText } from '../utils/logoUtils'

interface StockLogoProps {
  stock: Stock
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const SIZE_CLASSES = {
  small: 'stock-logo-small',
  medium: 'stock-logo-medium',
  large: 'stock-logo-large',
}

export default function StockLogo({ stock, size = 'medium', className = '' }: StockLogoProps) {
  const [imageError, setImageError] = useState(false)
  const logoUrl = getLogoUrl(stock.ticker, stock.exchange)
  const fallbackColor = getLogoColor(stock.sector)
  const fallbackText = getLogoText(stock.ticker)
  const sizeClass = SIZE_CLASSES[size]

  // If no logo URL or image failed to load, show fallback
  if (!logoUrl || imageError) {
    return (
      <div
        className={`${sizeClass} ${className}`}
        style={{ backgroundColor: fallbackColor }}
      >
        {fallbackText}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={`${stock.stock_name} logo`}
      className={`${sizeClass} ${className}`}
      onError={() => setImageError(true)}
    />
  )
}
