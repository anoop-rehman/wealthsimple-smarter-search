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
def seed_database_endpoint():
    """
    Seed the database with sample stock data.
    
    This endpoint runs the seed_database.py script logic.
    WARNING: This will delete all existing stocks and replace them with sample data.
    """
    try:
        # Import the seed function
        import sys
        import os
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        scripts_dir = os.path.join(backend_dir, 'scripts')
        sys.path.insert(0, backend_dir)
        
        # Change to backend directory to ensure relative imports work
        original_cwd = os.getcwd()
        os.chdir(backend_dir)
        
        try:
            from scripts.seed_database import seed_database
            seed_database()
        finally:
            os.chdir(original_cwd)
        
        return UpdateResponse(
            success=True,
            message="Database seeded successfully with 50 stocks"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed database: {str(e)}"
        )
