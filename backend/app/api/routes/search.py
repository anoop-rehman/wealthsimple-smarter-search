"""Search API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.search import SearchRequest, SearchResponse, CacheStatsResponse
from app.services.search_service import search_stocks
from app.services.cache_service import query_cache, warm_cache

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


@router.get("/cache/stats", response_model=CacheStatsResponse)
def get_cache_stats():
    """
    Get query cache statistics.
    
    Returns cache size, hit/miss counts, and hit rate percentage.
    """
    return CacheStatsResponse(**query_cache.stats())


@router.post("/cache/clear")
def clear_cache():
    """
    Clear the query cache.
    
    This removes all cached query -> SQL mappings.
    """
    query_cache.clear()
    return {"message": "Cache cleared successfully"}


@router.post("/cache/warm")
def warm_cache_endpoint():
    """
    Pre-warm the cache with suggested prompts.
    
    This generates SQL for the 5 suggested homepage prompts
    so they're ready instantly when users click them.
    """
    result = warm_cache()
    return {
        "message": f"Cache warmed with {result['warmed']} new queries",
        **result
    }
