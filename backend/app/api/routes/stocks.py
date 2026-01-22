"""Stock management API routes."""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db, SessionLocal
from app.services.stock_update_service import (
    update_all_stocks,
    update_stock_from_yahoo,
    add_stock_from_yahoo
)
from app.services.chart_service import fetch_chart_data, fetch_charts_batch
from app.models.stock import Stock

router = APIRouter(tags=["stocks"])


class UpdateResponse(BaseModel):
    success: bool
    message: str
    updated: Optional[int] = None
    failed: Optional[int] = None


class AddStockRequest(BaseModel):
    ticker: str
    yahoo_ticker: Optional[str] = None


@router.post("/stocks/update", response_model=UpdateResponse)
def update_stocks(
    background_tasks: BackgroundTasks,
    tsx_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    Trigger an update of all stock prices from Yahoo Finance.

    This runs in the background and updates all stocks in the database.
    """
    result = update_all_stocks(db, tsx_only=tsx_only)
    return UpdateResponse(
        success=True,
        message=f"Updated {result['success']} stocks",
        updated=result['success'],
        failed=result['failed']
    )


@router.post("/stocks/update/{ticker}", response_model=UpdateResponse)
def update_single_stock(ticker: str, db: Session = Depends(get_db)):
    """
    Update a single stock's price from Yahoo Finance.
    """
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()
    if not stock:
        return UpdateResponse(success=False, message=f"Stock {ticker} not found")

    # Determine Yahoo ticker
    if stock.exchange in ('TSX', 'TOR', 'Toronto'):
        yahoo_ticker = f"{stock.ticker}.TO"
    elif stock.exchange in ('TSXV', 'TSX-V'):
        yahoo_ticker = f"{stock.ticker}.V"
    else:
        yahoo_ticker = stock.ticker

    if update_stock_from_yahoo(db, stock.ticker, yahoo_ticker):
        return UpdateResponse(success=True, message=f"Updated {ticker}")
    else:
        return UpdateResponse(success=False, message=f"Failed to update {ticker}")


@router.post("/stocks/add", response_model=UpdateResponse)
def add_stock(request: AddStockRequest, db: Session = Depends(get_db)):
    """
    Add a new stock to the database using Yahoo Finance data.

    For TSX stocks, provide the yahoo_ticker with .TO suffix (e.g., "RY.TO").
    """
    if add_stock_from_yahoo(db, request.ticker.upper(), request.yahoo_ticker):
        return UpdateResponse(success=True, message=f"Added {request.ticker}")
    else:
        return UpdateResponse(success=False, message=f"Failed to add {request.ticker}")


@router.get("/stocks/list")
def list_stocks(
    exchange: Optional[str] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all stocks in the database with optional filtering.
    """
    query = db.query(Stock)

    if exchange:
        query = query.filter(Stock.exchange.ilike(f"%{exchange}%"))
    if sector:
        query = query.filter(Stock.sector.ilike(f"%{sector}%"))

    stocks = query.order_by(Stock.ticker).all()

    return {
        "count": len(stocks),
        "stocks": [
            {
                "ticker": s.ticker,
                "name": s.stock_name,
                "exchange": s.exchange,
                "sector": s.sector,
                "price": float(s.current_price) if s.current_price else None,
                "change_percent": float(s.day_change_percent) if s.day_change_percent else None
            }
            for s in stocks
        ]
    }


# ============ Chart Endpoints ============

class ChartBatchRequest(BaseModel):
    tickers: List[str]
    period: str = "1D"


@router.get("/stocks/{ticker}/chart")
def get_stock_chart(
    ticker: str,
    period: str = "1D",
    db: Session = Depends(get_db)
):
    """
    Get chart data for a single stock.

    Periods: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y
    """
    chart_data = fetch_chart_data(db, ticker, period)

    if not chart_data:
        raise HTTPException(status_code=404, detail=f"Chart data not found for {ticker}")

    return chart_data


@router.post("/stocks/charts")
def get_charts_batch(
    request: ChartBatchRequest,
    db: Session = Depends(get_db)
):
    """
    Get chart data for multiple stocks (batch request).

    Use this for efficiently fetching mini-chart data for list views.
    Returns simplified data (just prices and timestamps) for each ticker.
    """
    if len(request.tickers) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 tickers per request")

    charts = fetch_charts_batch(db, request.tickers, request.period)

    return {
        "period": request.period,
        "charts": charts
    }


@router.get("/stocks/{ticker}")
def get_stock_detail(
    ticker: str,
    db: Session = Depends(get_db)
):
    """
    Get full details for a single stock.
    """
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()

    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    return {
        "ticker": stock.ticker,
        "stock_name": stock.stock_name,
        "description": stock.description,
        "sector": stock.sector,
        "industry": stock.industry,
        "exchange": stock.exchange,
        "current_price": float(stock.current_price) if stock.current_price else None,
        "closing_price": float(stock.closing_price) if stock.closing_price else None,
        "day_change_amount": float(stock.day_change_amount) if stock.day_change_amount else None,
        "day_change_percent": float(stock.day_change_percent) if stock.day_change_percent else None,
        "market_open": float(stock.market_open) if stock.market_open else None,
        "market_high": float(stock.market_high) if stock.market_high else None,
        "market_low": float(stock.market_low) if stock.market_low else None,
        "week_52_high": float(stock.week_52_high) if stock.week_52_high else None,
        "week_52_low": float(stock.week_52_low) if stock.week_52_low else None,
        "bid_price": float(stock.bid_price) if stock.bid_price else None,
        "bid_size": stock.bid_size,
        "ask_price": float(stock.ask_price) if stock.ask_price else None,
        "ask_size": stock.ask_size,
        "volume": stock.volume,
        "average_volume": stock.average_volume,
        "market_cap": stock.market_cap,
        "market_cap_numeric": stock.market_cap_numeric,
        "pe_ratio": float(stock.pe_ratio) if stock.pe_ratio else None,
        "dividend_yield_12month": stock.dividend_yield_12month,
        "ex_dividend_date": stock.ex_dividend_date.isoformat() if stock.ex_dividend_date else None,
        "earnings_call_date": stock.earnings_call_date.isoformat() if stock.earnings_call_date else None,
    }


@router.post("/admin/seed-database", response_model=UpdateResponse)
def seed_database_endpoint(db: Session = Depends(get_db)):
    """
    Seed the database with sample stock data.
    
    WARNING: This will delete all existing stocks and replace them with sample data.
    """
    from datetime import date, timedelta
    from decimal import Decimal
    import random
    
    # Stock data
    STOCK_DATA = [
        {"ticker": "UNH", "stock_name": "UnitedHealth Group Inc", "sector": "Healthcare", "industry": "Health Insurance", "current_price": Decimal("523.45"), "market_cap_numeric": 485000000000, "pe_ratio": Decimal("21.5")},
        {"ticker": "JNJ", "stock_name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("156.78"), "market_cap_numeric": 378000000000, "pe_ratio": Decimal("15.2")},
        {"ticker": "PFE", "stock_name": "Pfizer Inc", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("28.34"), "market_cap_numeric": 160000000000, "pe_ratio": Decimal("12.8")},
        {"ticker": "ABBV", "stock_name": "AbbVie Inc", "sector": "Healthcare", "industry": "Biotechnology", "current_price": Decimal("174.56"), "market_cap_numeric": 308000000000, "pe_ratio": Decimal("45.3")},
        {"ticker": "MRK", "stock_name": "Merck & Co Inc", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("125.89"), "market_cap_numeric": 319000000000, "pe_ratio": Decimal("105.2")},
        {"ticker": "LLY", "stock_name": "Eli Lilly and Company", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("758.23"), "market_cap_numeric": 720000000000, "pe_ratio": Decimal("118.5")},
        {"ticker": "GEHC", "stock_name": "GE HealthCare Technologies Inc", "sector": "Healthcare", "industry": "Medical Devices", "current_price": Decimal("82.45"), "market_cap_numeric": 38000000000, "pe_ratio": Decimal("22.1")},
        {"ticker": "CVS", "stock_name": "CVS Health Corporation", "sector": "Healthcare", "industry": "Healthcare Services", "current_price": Decimal("56.78"), "market_cap_numeric": 72000000000, "pe_ratio": Decimal("9.8")},
        {"ticker": "AAPL", "stock_name": "Apple Inc", "sector": "Technology", "industry": "Consumer Electronics", "current_price": Decimal("189.34"), "market_cap_numeric": 2950000000000, "pe_ratio": Decimal("29.5")},
        {"ticker": "MSFT", "stock_name": "Microsoft Corporation", "sector": "Technology", "industry": "Software", "current_price": Decimal("378.92"), "market_cap_numeric": 2810000000000, "pe_ratio": Decimal("35.2")},
        {"ticker": "GOOGL", "stock_name": "Alphabet Inc", "sector": "Technology", "industry": "Internet Services", "current_price": Decimal("142.56"), "market_cap_numeric": 1790000000000, "pe_ratio": Decimal("24.8")},
        {"ticker": "NVDA", "stock_name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("495.67"), "market_cap_numeric": 1220000000000, "pe_ratio": Decimal("68.3")},
        {"ticker": "META", "stock_name": "Meta Platforms Inc", "sector": "Technology", "industry": "Social Media", "current_price": Decimal("356.78"), "market_cap_numeric": 920000000000, "pe_ratio": Decimal("26.4")},
        {"ticker": "AMD", "stock_name": "Advanced Micro Devices Inc", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("156.34"), "market_cap_numeric": 252000000000, "pe_ratio": Decimal("245.6")},
        {"ticker": "INTC", "stock_name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("42.56"), "market_cap_numeric": 180000000000, "pe_ratio": Decimal("92.4")},
        {"ticker": "CRM", "stock_name": "Salesforce Inc", "sector": "Technology", "industry": "Software", "current_price": Decimal("268.45"), "market_cap_numeric": 261000000000, "pe_ratio": Decimal("47.8")},
        {"ticker": "JPM", "stock_name": "JPMorgan Chase & Co", "sector": "Finance", "industry": "Banking", "current_price": Decimal("178.34"), "market_cap_numeric": 515000000000, "pe_ratio": Decimal("11.2")},
        {"ticker": "BAC", "stock_name": "Bank of America Corporation", "sector": "Finance", "industry": "Banking", "current_price": Decimal("34.56"), "market_cap_numeric": 272000000000, "pe_ratio": Decimal("10.5")},
        {"ticker": "WFC", "stock_name": "Wells Fargo & Company", "sector": "Finance", "industry": "Banking", "current_price": Decimal("52.78"), "market_cap_numeric": 188000000000, "pe_ratio": Decimal("11.8")},
        {"ticker": "GS", "stock_name": "Goldman Sachs Group Inc", "sector": "Finance", "industry": "Investment Banking", "current_price": Decimal("378.45"), "market_cap_numeric": 122000000000, "pe_ratio": Decimal("14.2")},
        {"ticker": "V", "stock_name": "Visa Inc", "sector": "Finance", "industry": "Payment Processing", "current_price": Decimal("278.56"), "market_cap_numeric": 556000000000, "pe_ratio": Decimal("29.8")},
        {"ticker": "MA", "stock_name": "Mastercard Incorporated", "sector": "Finance", "industry": "Payment Processing", "current_price": Decimal("445.67"), "market_cap_numeric": 415000000000, "pe_ratio": Decimal("35.6")},
        {"ticker": "AMZN", "stock_name": "Amazon.com Inc", "sector": "Consumer Discretionary", "industry": "E-Commerce", "current_price": Decimal("178.45"), "market_cap_numeric": 1850000000000, "pe_ratio": Decimal("62.5")},
        {"ticker": "TSLA", "stock_name": "Tesla Inc", "sector": "Consumer Discretionary", "industry": "Electric Vehicles", "current_price": Decimal("245.67"), "market_cap_numeric": 780000000000, "pe_ratio": Decimal("72.3")},
        {"ticker": "HD", "stock_name": "The Home Depot Inc", "sector": "Consumer Discretionary", "industry": "Home Improvement", "current_price": Decimal("345.78"), "market_cap_numeric": 343000000000, "pe_ratio": Decimal("22.8")},
        {"ticker": "NKE", "stock_name": "NIKE Inc", "sector": "Consumer Discretionary", "industry": "Apparel", "current_price": Decimal("106.34"), "market_cap_numeric": 162000000000, "pe_ratio": Decimal("28.5")},
        {"ticker": "MCD", "stock_name": "McDonald's Corporation", "sector": "Consumer Discretionary", "industry": "Restaurants", "current_price": Decimal("289.56"), "market_cap_numeric": 210000000000, "pe_ratio": Decimal("24.6")},
        {"ticker": "PG", "stock_name": "Procter & Gamble Company", "sector": "Consumer Staples", "industry": "Household Products", "current_price": Decimal("156.78"), "market_cap_numeric": 368000000000, "pe_ratio": Decimal("26.2")},
        {"ticker": "KO", "stock_name": "The Coca-Cola Company", "sector": "Consumer Staples", "industry": "Beverages", "current_price": Decimal("62.34"), "market_cap_numeric": 269000000000, "pe_ratio": Decimal("24.8")},
        {"ticker": "PEP", "stock_name": "PepsiCo Inc", "sector": "Consumer Staples", "industry": "Beverages", "current_price": Decimal("172.45"), "market_cap_numeric": 237000000000, "pe_ratio": Decimal("26.5")},
        {"ticker": "COST", "stock_name": "Costco Wholesale Corporation", "sector": "Consumer Staples", "industry": "Retail", "current_price": Decimal("578.23"), "market_cap_numeric": 256000000000, "pe_ratio": Decimal("42.8")},
        {"ticker": "WMT", "stock_name": "Walmart Inc", "sector": "Consumer Staples", "industry": "Retail", "current_price": Decimal("162.56"), "market_cap_numeric": 437000000000, "pe_ratio": Decimal("28.3")},
        {"ticker": "XOM", "stock_name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("106.78"), "market_cap_numeric": 425000000000, "pe_ratio": Decimal("12.5")},
        {"ticker": "CVX", "stock_name": "Chevron Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("148.34"), "market_cap_numeric": 276000000000, "pe_ratio": Decimal("11.8")},
        {"ticker": "COP", "stock_name": "ConocoPhillips", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("112.56"), "market_cap_numeric": 132000000000, "pe_ratio": Decimal("10.2")},
        {"ticker": "SLB", "stock_name": "Schlumberger Limited", "sector": "Energy", "industry": "Oil Services", "current_price": Decimal("52.34"), "market_cap_numeric": 74000000000, "pe_ratio": Decimal("16.8")},
        {"ticker": "UNP", "stock_name": "Union Pacific Corporation", "sector": "Industrials", "industry": "Railroads", "current_price": Decimal("245.67"), "market_cap_numeric": 148000000000, "pe_ratio": Decimal("22.4")},
        {"ticker": "HON", "stock_name": "Honeywell International Inc", "sector": "Industrials", "industry": "Diversified Industrials", "current_price": Decimal("198.45"), "market_cap_numeric": 129000000000, "pe_ratio": Decimal("24.6")},
        {"ticker": "BA", "stock_name": "The Boeing Company", "sector": "Industrials", "industry": "Aerospace", "current_price": Decimal("212.34"), "market_cap_numeric": 128000000000, "pe_ratio": None},
        {"ticker": "CAT", "stock_name": "Caterpillar Inc", "sector": "Industrials", "industry": "Heavy Machinery", "current_price": Decimal("278.56"), "market_cap_numeric": 138000000000, "pe_ratio": Decimal("15.8")},
        {"ticker": "NFLX", "stock_name": "Netflix Inc", "sector": "Communication", "industry": "Streaming", "current_price": Decimal("478.34"), "market_cap_numeric": 210000000000, "pe_ratio": Decimal("45.6")},
        {"ticker": "DIS", "stock_name": "The Walt Disney Company", "sector": "Communication", "industry": "Entertainment", "current_price": Decimal("92.45"), "market_cap_numeric": 169000000000, "pe_ratio": Decimal("68.2")},
        {"ticker": "CMCSA", "stock_name": "Comcast Corporation", "sector": "Communication", "industry": "Cable & Satellite", "current_price": Decimal("42.78"), "market_cap_numeric": 169000000000, "pe_ratio": Decimal("10.5")},
        {"ticker": "T", "stock_name": "AT&T Inc", "sector": "Communication", "industry": "Telecommunications", "current_price": Decimal("17.56"), "market_cap_numeric": 126000000000, "pe_ratio": Decimal("8.2")},
        {"ticker": "LIN", "stock_name": "Linde plc", "sector": "Materials", "industry": "Industrial Gases", "current_price": Decimal("412.34"), "market_cap_numeric": 198000000000, "pe_ratio": Decimal("32.5")},
        {"ticker": "APD", "stock_name": "Air Products and Chemicals Inc", "sector": "Materials", "industry": "Industrial Gases", "current_price": Decimal("278.56"), "market_cap_numeric": 62000000000, "pe_ratio": Decimal("26.8")},
        {"ticker": "FCX", "stock_name": "Freeport-McMoRan Inc", "sector": "Materials", "industry": "Mining", "current_price": Decimal("42.34"), "market_cap_numeric": 61000000000, "pe_ratio": Decimal("28.5")},
        {"ticker": "NEE", "stock_name": "NextEra Energy Inc", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("72.34"), "market_cap_numeric": 148000000000, "pe_ratio": Decimal("22.4")},
        {"ticker": "DUK", "stock_name": "Duke Energy Corporation", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("98.56"), "market_cap_numeric": 76000000000, "pe_ratio": Decimal("18.6")},
        {"ticker": "SO", "stock_name": "The Southern Company", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("72.45"), "market_cap_numeric": 79000000000, "pe_ratio": Decimal("20.2")},
    ]
    
    def format_market_cap(value: int) -> str:
        if value >= 1_000_000_000_000:
            return f"${value / 1_000_000_000_000:.2f}T"
        elif value >= 1_000_000_000:
            return f"${value / 1_000_000_000:.2f}B"
        elif value >= 1_000_000:
            return f"${value / 1_000_000:.2f}M"
        return f"${value}"
    
    try:
        # Clear existing data
        db.query(Stock).delete()
        db.commit()
        
        # Generate stock data
        today = date.today()
        stocks = []
        
        for i, stock_base in enumerate(STOCK_DATA):
            current_price = stock_base["current_price"]
            day_change_pct = Decimal(str(random.uniform(-3.5, 3.5)))
            day_change_amt = current_price * day_change_pct / 100
            closing_price = current_price - day_change_amt
            
            earnings_offset = random.randint(1, 30)
            earnings_date = today + timedelta(days=earnings_offset)
            
            ex_div_offset = random.randint(-30, 60)
            ex_div_date = today + timedelta(days=ex_div_offset)
            
            stock = Stock(
                ticker=stock_base["ticker"],
                stock_name=stock_base["stock_name"],
                description=f"{stock_base['stock_name']} is a leading company in the {stock_base['industry']} industry.",
                sector=stock_base["sector"],
                industry=stock_base["industry"],
                current_price=current_price,
                closing_price=closing_price,
                day_change_amount=round(day_change_amt, 4),
                day_change_percent=round(day_change_pct, 4),
                market_open=current_price * Decimal(str(random.uniform(0.98, 1.02))),
                market_high=current_price * Decimal(str(random.uniform(1.01, 1.03))),
                market_low=current_price * Decimal(str(random.uniform(0.97, 0.99))),
                week_52_high=current_price * Decimal(str(random.uniform(1.1, 1.4))),
                week_52_low=current_price * Decimal(str(random.uniform(0.6, 0.9))),
                bid_price=current_price - Decimal("0.01"),
                bid_size=random.randint(100, 1000),
                ask_price=current_price + Decimal("0.01"),
                ask_size=random.randint(100, 1000),
                last_sale_price=current_price,
                last_sale_size=random.randint(50, 500),
                volume=random.randint(1000000, 50000000),
                average_volume=random.randint(5000000, 30000000),
                exchange="NASDAQ" if i % 2 == 0 else "NYSE",
                margin_requirement="100%",
                dividend_frequency="Quarterly" if random.random() > 0.2 else "Annual",
                dividend_yield_12month=f"{random.uniform(0.5, 4.0):.2f}%",
                ex_dividend_date=ex_div_date,
                market_cap=format_market_cap(stock_base["market_cap_numeric"]),
                market_cap_numeric=stock_base["market_cap_numeric"],
                shares_outstanding=f"{stock_base['market_cap_numeric'] // int(current_price):,}",
                pe_ratio=stock_base["pe_ratio"],
                earnings_call_date=earnings_date,
            )
            stocks.append(stock)
        
        # Insert all stocks
        for stock in stocks:
            db.add(stock)
        
        db.commit()
        
        return UpdateResponse(
            success=True,
            message=f"Database seeded successfully with {len(stocks)} stocks"
        )
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed database: {str(e)}"
        )


@router.post("/admin/seed-real-stocks", response_model=UpdateResponse)
def seed_real_stocks_endpoint(db: Session = Depends(get_db)):
    """
    Seed the database with real stock data from Yahoo Finance.
    
    Seeds 51 TSX stocks, 50 NYSE stocks, and 50 NASDAQ stocks (151 total).
    WARNING: This will delete all existing stocks and replace them with real data.
    This may take a few minutes as it fetches data from Yahoo Finance.
    """
    from app.services.stock_update_service import add_stock_from_yahoo
    
    # TSX stocks (51)
    TSX_STOCKS = [
        ("RY", "RY.TO"), ("TD", "TD.TO"), ("BNS", "BNS.TO"), ("BMO", "BMO.TO"), ("CM", "CM.TO"), ("NA", "NA.TO"),
        ("MFC", "MFC.TO"), ("SLF", "SLF.TO"), ("IFC", "IFC.TO"), ("POW", "POW.TO"),
        ("ENB", "ENB.TO"), ("TRP", "TRP.TO"), ("CNQ", "CNQ.TO"), ("SU", "SU.TO"), ("CVE", "CVE.TO"), ("IMO", "IMO.TO"),
        ("BCE", "BCE.TO"), ("T", "T.TO"), ("RCI-B", "RCI-B.TO"),
        ("CNR", "CNR.TO"), ("CP", "CP.TO"),
        ("ABX", "ABX.TO"), ("NTR", "NTR.TO"), ("FM", "FM.TO"), ("TECK-B", "TECK-B.TO"),
        ("ATD", "ATD.TO"), ("L", "L.TO"), ("DOL", "DOL.TO"), ("MRU", "MRU.TO"), ("QSR", "QSR.TO"),
        ("SHOP", "SHOP.TO"), ("CSU", "CSU.TO"), ("OTEX", "OTEX.TO"), ("BB", "BB.TO"),
        ("BAM", "BAM.TO"), ("BN", "BN.TO"),
        ("FTS", "FTS.TO"), ("EMA", "EMA.TO"), ("H", "H.TO"),
        ("WSP", "WSP.TO"), ("GIB-A", "GIB-A.TO"),
        ("SAP", "SAP.TO"), ("WCN", "WCN.TO"), ("TRI", "TRI.TO"), ("GFL", "GFL.TO"), ("CCL-B", "CCL-B.TO"),
        ("FFH", "FFH.TO"), ("AQN", "AQN.TO"), ("CTC-A", "CTC-A.TO"),
    ]
    
    # NYSE stocks (50)
    NYSE_STOCKS = [
        ("BRK-B", None), ("V", None), ("UNH", None), ("JNJ", None), ("WMT", None), ("JPM", None), ("MA", None),
        ("XOM", None), ("PG", None), ("HD", None),
        ("BAC", None), ("WFC", None), ("GS", None), ("MS", None), ("C", None), ("BLK", None), ("SCHW", None),
        ("AXP", None), ("CB", None), ("MMC", None),
        ("LLY", None), ("MRK", None), ("ABBV", None), ("PFE", None), ("TMO", None), ("ABT", None), ("DHR", None),
        ("BMY", None), ("CVS", None), ("CI", None),
        ("CVX", None), ("COP", None), ("SLB", None), ("EOG", None), ("OXY", None),
        ("CAT", None), ("HON", None), ("UNP", None), ("BA", None), ("GE", None), ("RTX", None), ("DE", None),
        ("LMT", None), ("MMM", None),
        ("KO", None), ("MCD", None), ("DIS", None), ("NKE", None), ("LOW", None), ("TGT", None),
    ]
    
    # NASDAQ stocks (50)
    NASDAQ_STOCKS = [
        ("AAPL", None), ("MSFT", None), ("GOOGL", None), ("GOOG", None), ("AMZN", None), ("NVDA", None),
        ("META", None), ("TSLA", None), ("AVGO", None), ("COST", None),
        ("ADBE", None), ("NFLX", None), ("AMD", None), ("QCOM", None), ("INTC", None), ("CSCO", None), ("TXN", None),
        ("INTU", None), ("AMAT", None), ("MU", None),
        ("CMCSA", None), ("TMUS", None), ("CHTR", None), ("ATVI", None), ("EA", None),
        ("PEP", None), ("SBUX", None), ("MDLZ", None), ("MNST", None), ("KDP", None), ("LULU", None), ("ROST", None),
        ("DLTR", None), ("EBAY", None), ("MAR", None),
        ("AMGN", None), ("GILD", None), ("VRTX", None), ("REGN", None), ("MRNA", None), ("BIIB", None), ("ILMN", None),
        ("DXCM", None), ("ISRG", None), ("IDXX", None),
        ("PYPL", None), ("ADP", None), ("PAYX", None), ("CRWD", None), ("PANW", None),
    ]
    
    try:
        # Clear existing data
        db.query(Stock).delete()
        db.commit()
        
        success_count = 0
        failure_count = 0
        all_stocks = []
        
        # Seed TSX stocks
        print("Seeding TSX stocks...")
        for ticker, yahoo_ticker in TSX_STOCKS:
            if add_stock_from_yahoo(db, ticker, yahoo_ticker):
                success_count += 1
                all_stocks.append(ticker)
            else:
                failure_count += 1
                print(f"Failed to add TSX stock: {ticker}")
        
        # Seed NYSE stocks
        print("Seeding NYSE stocks...")
        for ticker, yahoo_ticker in NYSE_STOCKS:
            if add_stock_from_yahoo(db, ticker, yahoo_ticker):
                success_count += 1
                all_stocks.append(ticker)
            else:
                failure_count += 1
                print(f"Failed to add NYSE stock: {ticker}")
        
        # Seed NASDAQ stocks
        print("Seeding NASDAQ stocks...")
        for ticker, yahoo_ticker in NASDAQ_STOCKS:
            if add_stock_from_yahoo(db, ticker, yahoo_ticker):
                success_count += 1
                all_stocks.append(ticker)
            else:
                failure_count += 1
                print(f"Failed to add NASDAQ stock: {ticker}")
        
        db.commit()
        
        return UpdateResponse(
            success=True,
            message=f"Seeded {success_count} stocks successfully ({failure_count} failed). TSX: {len([s for s in TSX_STOCKS if s[0] in all_stocks])}, NYSE: {len([s for s in NYSE_STOCKS if s[0] in all_stocks])}, NASDAQ: {len([s for s in NASDAQ_STOCKS if s[0] in all_stocks])}",
            updated=success_count,
            failed=failure_count
        )
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed real stocks: {str(e)}"
        )
