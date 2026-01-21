"""Search API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search_service import search_stocks

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Search stocks using natural language query.

    This endpoint accepts a natural language query and uses AI to convert it
    to SQL, then executes the query against the stocks database.

    Examples:
    - "Healthcare stocks with earnings calls in the next week"
    - "Large cap technology stocks"
    - "Show me the top gainers today"
    - "Stocks under $50"
    """
    return search_stocks(db, request.query, request.limit)


@router.get("/search", response_model=SearchResponse)
def search_get(query: str, limit: int = 50, db: Session = Depends(get_db)):
    """
    Search stocks using natural language query (GET version).

    This is a GET version of the search endpoint for simpler client usage.
    """
    return search_stocks(db, query, limit)
