"""Service for updating stock data from Yahoo Finance."""

import yfinance as yf
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from app.models.stock import Stock


def normalize_exchange(yahoo_exchange: Optional[str], yahoo_ticker: Optional[str] = None) -> str:
    """
    Normalize Yahoo Finance exchange codes to readable names.
    
    Yahoo Finance returns codes like:
    - NMS, NCM, NGM -> NASDAQ
    - NYQ -> NYSE
    - TOR -> TSX
    - etc.
    """
    if not yahoo_exchange:
        # Try to infer from ticker suffix
        if yahoo_ticker and yahoo_ticker.endswith('.TO'):
            return 'TSX'
        return 'Unknown'
    
    exchange_upper = yahoo_exchange.upper()
    
    # NASDAQ variants
    if exchange_upper in ('NMS', 'NCM', 'NGM', 'NASDAQ'):
        return 'NASDAQ'
    
    # NYSE
    if exchange_upper in ('NYQ', 'NYSE'):
        return 'NYSE'
    
    # TSX
    if exchange_upper in ('TOR', 'TSX', 'TORONTO'):
        return 'TSX'
    
    # TSX Venture
    if exchange_upper in ('TSXV', 'TSX-V', 'VENTURE'):
        return 'TSXV'
    
    # Return original if we don't recognize it
    return yahoo_exchange


def format_market_cap(value: Optional[int]) -> str:
    """Format market cap as human readable string."""
    if not value:
        return "-"
    if value >= 1_000_000_000_000:
        return f"${value / 1_000_000_000_000:.2f}T"
    elif value >= 1_000_000_000:
        return f"${value / 1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    return f"${value:,}"


def update_stock_from_yahoo(db: Session, ticker: str, yahoo_ticker: Optional[str] = None) -> bool:
    """
    Update a single stock's data from Yahoo Finance.

    Args:
        db: Database session
        ticker: The stock ticker in our database (e.g., "RY")
        yahoo_ticker: The Yahoo Finance ticker if different (e.g., "RY.TO" for TSX)

    Returns:
        True if update was successful, False otherwise
    """
    try:
        # Use yahoo_ticker if provided, otherwise use the ticker directly
        yf_ticker = yahoo_ticker or ticker
        stock_info = yf.Ticker(yf_ticker)
        info = stock_info.info

        if not info or 'regularMarketPrice' not in info:
            print(f"No data found for {yf_ticker}")
            return False

        # Get the stock from database
        db_stock = db.query(Stock).filter(Stock.ticker == ticker).first()

        if not db_stock:
            print(f"Stock {ticker} not found in database")
            return False

        # Update price data
        current_price = info.get('regularMarketPrice') or info.get('currentPrice')
        previous_close = info.get('regularMarketPreviousClose') or info.get('previousClose')

        if current_price:
            db_stock.current_price = Decimal(str(current_price))
        if previous_close:
            db_stock.closing_price = Decimal(str(previous_close))

        # Calculate day change
        if current_price and previous_close:
            change_amount = current_price - previous_close
            change_percent = (change_amount / previous_close) * 100
            db_stock.day_change_amount = Decimal(str(round(change_amount, 4)))
            db_stock.day_change_percent = Decimal(str(round(change_percent, 4)))

        # Update market data
        if info.get('regularMarketOpen'):
            db_stock.market_open = Decimal(str(info['regularMarketOpen']))
        if info.get('regularMarketDayHigh') or info.get('dayHigh'):
            db_stock.market_high = Decimal(str(info.get('regularMarketDayHigh') or info.get('dayHigh')))
        if info.get('regularMarketDayLow') or info.get('dayLow'):
            db_stock.market_low = Decimal(str(info.get('regularMarketDayLow') or info.get('dayLow')))
        if info.get('fiftyTwoWeekHigh'):
            db_stock.week_52_high = Decimal(str(info['fiftyTwoWeekHigh']))
        if info.get('fiftyTwoWeekLow'):
            db_stock.week_52_low = Decimal(str(info['fiftyTwoWeekLow']))

        # Update bid/ask
        if info.get('bid'):
            db_stock.bid_price = Decimal(str(info['bid']))
        if info.get('bidSize'):
            db_stock.bid_size = info['bidSize']
        if info.get('ask'):
            db_stock.ask_price = Decimal(str(info['ask']))
        if info.get('askSize'):
            db_stock.ask_size = info['askSize']

        # Update volume
        if info.get('regularMarketVolume') or info.get('volume'):
            db_stock.volume = info.get('regularMarketVolume') or info.get('volume')
        if info.get('averageVolume'):
            db_stock.average_volume = info['averageVolume']

        # Update market cap
        market_cap = info.get('marketCap')
        if market_cap:
            db_stock.market_cap_numeric = market_cap
            db_stock.market_cap = format_market_cap(market_cap)

        # Update PE ratio
        if info.get('trailingPE'):
            db_stock.pe_ratio = Decimal(str(round(info['trailingPE'], 2)))
        elif info.get('forwardPE'):
            db_stock.pe_ratio = Decimal(str(round(info['forwardPE'], 2)))

        # Update dividend info
        if info.get('dividendYield'):
            db_stock.dividend_yield_12month = f"{info['dividendYield'] * 100:.2f}%"
        if info.get('exDividendDate'):
            try:
                ex_div_timestamp = info['exDividendDate']
                if isinstance(ex_div_timestamp, (int, float)):
                    db_stock.ex_dividend_date = datetime.fromtimestamp(ex_div_timestamp).date()
            except:
                pass

        # Update earnings call date from calendar
        try:
            calendar = stock_info.calendar
            if calendar and isinstance(calendar, dict) and 'Earnings Date' in calendar:
                earnings_dates = calendar['Earnings Date']
                if isinstance(earnings_dates, list) and len(earnings_dates) > 0:
                    # Get the first (next) earnings date
                    next_earnings = earnings_dates[0]
                    if isinstance(next_earnings, date):
                        db_stock.earnings_call_date = next_earnings
                    elif isinstance(next_earnings, datetime):
                        db_stock.earnings_call_date = next_earnings.date()
        except Exception as e:
            print(f"Could not parse earnings date for {ticker}: {e}")

        # Update company info if missing
        if info.get('longName') and not db_stock.stock_name:
            db_stock.stock_name = info['longName']
        if info.get('sector') and not db_stock.sector:
            db_stock.sector = info['sector']
        if info.get('industry') and not db_stock.industry:
            db_stock.industry = info['industry']
        if info.get('longBusinessSummary') and not db_stock.description:
            db_stock.description = info['longBusinessSummary']

        # Update exchange (normalize to readable name)
        if info.get('exchange'):
            db_stock.exchange = normalize_exchange(info['exchange'], yahoo_ticker)

        db.commit()
        print(f"Updated {ticker}: ${current_price:.2f} ({db_stock.day_change_percent:+.2f}%)")
        return True

    except Exception as e:
        print(f"Error updating {ticker}: {e}")
        db.rollback()
        return False


def add_stock_from_yahoo(db: Session, ticker: str, yahoo_ticker: Optional[str] = None) -> bool:
    """
    Add a new stock to the database using Yahoo Finance data.

    Args:
        db: Database session
        ticker: The stock ticker for our database
        yahoo_ticker: The Yahoo Finance ticker if different

    Returns:
        True if stock was added successfully, False otherwise
    """
    try:
        yf_ticker = yahoo_ticker or ticker
        stock_info = yf.Ticker(yf_ticker)
        info = stock_info.info

        if not info or 'regularMarketPrice' not in info:
            print(f"No data found for {yf_ticker}")
            return False

        # Check if stock already exists
        existing = db.query(Stock).filter(Stock.ticker == ticker).first()
        if existing:
            print(f"Stock {ticker} already exists, updating instead")
            return update_stock_from_yahoo(db, ticker, yahoo_ticker)

        current_price = info.get('regularMarketPrice') or info.get('currentPrice', 0)
        previous_close = info.get('regularMarketPreviousClose') or info.get('previousClose', current_price)
        change_amount = current_price - previous_close if current_price and previous_close else 0
        change_percent = (change_amount / previous_close * 100) if previous_close else 0

        market_cap = info.get('marketCap', 0)

        new_stock = Stock(
            ticker=ticker,
            stock_name=info.get('longName') or info.get('shortName') or ticker,
            description=info.get('longBusinessSummary', '') if info.get('longBusinessSummary') else f"{ticker} stock",
            sector=info.get('sector', 'Unknown'),
            industry=info.get('industry', 'Unknown'),
            current_price=Decimal(str(current_price)) if current_price else None,
            closing_price=Decimal(str(previous_close)) if previous_close else None,
            day_change_amount=Decimal(str(round(change_amount, 4))),
            day_change_percent=Decimal(str(round(change_percent, 4))),
            market_open=Decimal(str(info['regularMarketOpen'])) if info.get('regularMarketOpen') else None,
            market_high=Decimal(str(info.get('regularMarketDayHigh') or info.get('dayHigh', 0))) if info.get('regularMarketDayHigh') or info.get('dayHigh') else None,
            market_low=Decimal(str(info.get('regularMarketDayLow') or info.get('dayLow', 0))) if info.get('regularMarketDayLow') or info.get('dayLow') else None,
            week_52_high=Decimal(str(info['fiftyTwoWeekHigh'])) if info.get('fiftyTwoWeekHigh') else None,
            week_52_low=Decimal(str(info['fiftyTwoWeekLow'])) if info.get('fiftyTwoWeekLow') else None,
            bid_price=Decimal(str(info['bid'])) if info.get('bid') else None,
            bid_size=info.get('bidSize'),
            ask_price=Decimal(str(info['ask'])) if info.get('ask') else None,
            ask_size=info.get('askSize'),
            volume=info.get('regularMarketVolume') or info.get('volume'),
            average_volume=info.get('averageVolume'),
            exchange=normalize_exchange(info.get('exchange'), yahoo_ticker),
            market_cap=format_market_cap(market_cap),
            market_cap_numeric=market_cap,
            pe_ratio=Decimal(str(round(info['trailingPE'], 2))) if info.get('trailingPE') else None,
            dividend_yield_12month=f"{info['dividendYield'] * 100:.2f}%" if info.get('dividendYield') else None,
            earnings_call_date=None,  # Will be set below if available
        )
        
        # Set earnings call date from calendar
        try:
            calendar = stock_info.calendar
            if calendar and isinstance(calendar, dict) and 'Earnings Date' in calendar:
                earnings_dates = calendar['Earnings Date']
                if isinstance(earnings_dates, list) and len(earnings_dates) > 0:
                    # Get the first (next) earnings date
                    next_earnings = earnings_dates[0]
                    if isinstance(next_earnings, date):
                        new_stock.earnings_call_date = next_earnings
                    elif isinstance(next_earnings, datetime):
                        new_stock.earnings_call_date = next_earnings.date()
        except Exception as e:
            print(f"Could not parse earnings date for {ticker}: {e}")

        db.add(new_stock)
        db.commit()
        print(f"Added {ticker}: {new_stock.stock_name} - ${current_price:.2f}")
        return True

    except Exception as e:
        print(f"Error adding {ticker}: {e}")
        db.rollback()
        return False


def update_all_stocks(db: Session, tsx_only: bool = False) -> dict:
    """
    Update all stocks in the database.

    Args:
        db: Database session
        tsx_only: If True, only update TSX stocks

    Returns:
        Dict with success and failure counts
    """
    stocks = db.query(Stock).all()

    success_count = 0
    failure_count = 0

    for stock in stocks:
        # Determine Yahoo Finance ticker
        if stock.exchange in ('TSX', 'TOR', 'Toronto'):
            yahoo_ticker = f"{stock.ticker}.TO"
        elif stock.exchange in ('TSXV', 'TSX-V'):
            yahoo_ticker = f"{stock.ticker}.V"
        else:
            if tsx_only:
                continue
            yahoo_ticker = stock.ticker

        if update_stock_from_yahoo(db, stock.ticker, yahoo_ticker):
            success_count += 1
        else:
            failure_count += 1

    return {"success": success_count, "failed": failure_count}
