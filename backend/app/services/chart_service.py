"""Service for fetching stock chart/timeseries data from Yahoo Finance."""

import yfinance as yf
from datetime import datetime, timedelta
from typing import Optional
from app.models.stock import Stock
from sqlalchemy.orm import Session


# Period configurations: (yfinance_period, yfinance_interval)
PERIOD_CONFIG = {
    "1D": ("1d", "5m"),      # 5-minute intervals for 1 day
    "5D": ("5d", "15m"),     # 15-minute intervals for 5 days
    "1M": ("1mo", "1h"),     # 1-hour intervals for 1 month
    "3M": ("3mo", "1d"),     # Daily for 3 months
    "6M": ("6mo", "1d"),     # Daily for 6 months
    "1Y": ("1y", "1d"),      # Daily for 1 year
    "5Y": ("5y", "1wk"),     # Weekly for 5 years
    "10Y": ("10y", "1wk"),   # Weekly for 10 years (downsampled to monthly for display)
}


def get_yahoo_ticker(db: Session, ticker: str) -> Optional[str]:
    """Get the Yahoo Finance ticker for a stock."""
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()
    if not stock:
        return None

    # Determine Yahoo ticker based on exchange
    if stock.exchange in ('TSX', 'TOR', 'Toronto'):
        return f"{stock.ticker}.TO"
    elif stock.exchange in ('TSXV', 'TSX-V'):
        return f"{stock.ticker}.V"
    else:
        return stock.ticker


def fetch_chart_data(db: Session, ticker: str, period: str = "1D") -> Optional[dict]:
    """
    Fetch chart data for a single stock.

    Args:
        db: Database session
        ticker: Stock ticker (our database ticker)
        period: Time period (1D, 5D, 1M, 3M, 6M, 1Y, 5Y, 10Y)

    Returns:
        Dict with ticker, period, interval, and data points
    """
    if period not in PERIOD_CONFIG:
        period = "1D"

    yf_period, interval = PERIOD_CONFIG[period]

    # Get Yahoo ticker
    yahoo_ticker = get_yahoo_ticker(db, ticker)
    if not yahoo_ticker:
        # If not in database, try using ticker directly
        yahoo_ticker = ticker

    try:
        stock = yf.Ticker(yahoo_ticker)
        hist = stock.history(period=yf_period, interval=interval)

        if hist.empty:
            return None

        # Convert to list of data points
        data_points = []
        for timestamp, row in hist.iterrows():
            data_points.append({
                "timestamp": timestamp.isoformat(),
                "price": round(row["Close"], 2),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "volume": int(row["Volume"]) if row["Volume"] else 0
            })

        return {
            "ticker": ticker.upper(),
            "period": period,
            "interval": interval,
            "data_points": data_points,
            "count": len(data_points)
        }

    except Exception as e:
        print(f"Error fetching chart data for {ticker}: {e}")
        return None


def fetch_charts_batch(db: Session, tickers: list[str], period: str = "1D") -> dict:
    """
    Fetch chart data for multiple stocks.

    Args:
        db: Database session
        tickers: List of stock tickers
        period: Time period

    Returns:
        Dict mapping ticker to chart data (or None if failed)
    """
    results = {}

    for ticker in tickers:
        chart_data = fetch_chart_data(db, ticker, period)
        if chart_data:
            # For batch requests, only return essential data (prices for mini charts)
            results[ticker.upper()] = {
                "prices": [point["price"] for point in chart_data["data_points"]],
                "timestamps": [point["timestamp"] for point in chart_data["data_points"]]
            }
        else:
            results[ticker.upper()] = None

    return results
