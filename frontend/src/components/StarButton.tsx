import { useStarredStocks } from '../contexts/StarredStocksContext'
import './StarButton.css'

interface StarButtonProps {
  ticker: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export default function StarButton({ ticker, className = '', onClick }: StarButtonProps) {
  const { isStarred, toggleStar } = useStarredStocks()
  const starred = isStarred(ticker)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    toggleStar(ticker)
    onClick?.(e)
  }

  return (
    <span
      className={`star-button ${starred ? 'starred' : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e as any)
        }
      }}
      aria-label={starred ? `Unstar ${ticker}` : `Star ${ticker}`}
    >
      {starred ? '★' : '☆'}
    </span>
  )
}
