"""Stock management API routes."""

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.services.stock_update_service import (
    update_all_stocks,
    update_stock_from_yahoo,
    add_stock_from_yahoo
)
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
