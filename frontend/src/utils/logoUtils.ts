// Map exchange names to Logo.dev shortcodes
const EXCHANGE_SHORTCODES: Record<string, string> = {
  'TSX': '.TO',
  'TSXV': '.V',
  'TOR': '.TO',
  'TORONTO': '.TO',
  'NYSE': '', // No suffix needed for US exchanges
  'NASDAQ': '', // No suffix needed for US exchanges
  'NMS': '', // NASDAQ Market System
  'NCM': '', // NASDAQ Capital Market
  'NGM': '', // NASDAQ Global Market
  'NYQ': '', // NYSE
}

/**
 * Get the Logo.dev URL for a stock ticker
 * @param ticker - Stock ticker symbol
 * @param exchange - Exchange name (optional, used to determine shortcode)
 * @returns Logo URL or null if API key is not configured
 */
export function getLogoUrl(ticker: string, exchange?: string): string | null {
  const apiKey = import.meta.env.VITE_LOGO_DEV_TOKEN
  
  if (!apiKey) {
    console.warn('VITE_LOGO_DEV_TOKEN not configured')
    return null
  }

  // Determine if we need an exchange shortcode
  let tickerWithExchange = ticker.toUpperCase()
  
  if (exchange) {
    const shortcode = EXCHANGE_SHORTCODES[exchange.toUpperCase()]
    if (shortcode) {
      // Only append if not already present
      if (!tickerWithExchange.endsWith(shortcode)) {
        tickerWithExchange = tickerWithExchange + shortcode
      }
    }
  }

  return `https://img.logo.dev/ticker/${tickerWithExchange}?token=${apiKey}`
}

/**
 * Get fallback logo color based on sector
 */
export function getLogoColor(sector?: string): string {
  const sectorColors: Record<string, string> = {
    Healthcare: '#3b82f6',
    Technology: '#8b5cf6',
    Finance: '#10b981',
    'Financial Services': '#10b981',
    'Consumer Discretionary': '#f59e0b',
    'Consumer Cyclical': '#f59e0b',
    'Consumer Staples': '#ef4444',
    'Consumer Defensive': '#ef4444',
    Energy: '#f97316',
    Industrials: '#6366f1',
    Communication: '#ec4899',
    'Communication Services': '#ec4899',
    Materials: '#14b8a6',
    'Basic Materials': '#14b8a6',
    Utilities: '#84cc16',
    'Real Estate': '#0ea5e9',
  }
  return sectorColors[sector || ''] || '#6366f1'
}

/**
 * Get fallback logo text (first 2 letters of ticker)
 */
export function getLogoText(ticker: string): string {
  return ticker.length <= 2 ? ticker : ticker.slice(0, 2)
}
