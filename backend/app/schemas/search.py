from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal


class SearchRequest(BaseModel):
    query: str
    limit: int = 50


class StockResult(BaseModel):
    ticker: str
    stock_name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    current_price: Optional[Decimal] = None
    closing_price: Optional[Decimal] = None
    day_change_amount: Optional[Decimal] = None
    day_change_percent: Optional[Decimal] = None
    market_open: Optional[Decimal] = None
    market_high: Optional[Decimal] = None
    market_low: Optional[Decimal] = None
    week_52_high: Optional[Decimal] = None
    week_52_low: Optional[Decimal] = None
    bid_price: Optional[Decimal] = None
    bid_size: Optional[int] = None
    ask_price: Optional[Decimal] = None
    ask_size: Optional[int] = None
    last_sale_price: Optional[Decimal] = None
    last_sale_size: Optional[int] = None
    volume: Optional[int] = None
    average_volume: Optional[int] = None
    exchange: Optional[str] = None
    margin_requirement: Optional[str] = None
    dividend_frequency: Optional[str] = None
    dividend_yield_12month: Optional[str] = None
    ex_dividend_date: Optional[date] = None
    market_cap: Optional[str] = None
    market_cap_numeric: Optional[int] = None
    shares_outstanding: Optional[str] = None
    pe_ratio: Optional[Decimal] = None
    earnings_call_date: Optional[date] = None

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    success: bool
    results: list[StockResult]
    result_count: int
    generated_sql: Optional[str] = None
    error: Optional[str] = None
