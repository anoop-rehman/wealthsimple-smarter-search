"""Search service that orchestrates LLM and SQL services."""

from sqlalchemy.orm import Session
from app.services.llm_service import generate_sql_from_query
from app.services.sql_service import execute_sql, SQLValidationError
from app.services.cache_service import query_cache
from app.schemas.search import SearchResponse, StockResult


def search_stocks(db: Session, query: str, limit: int = 50) -> SearchResponse:
    """
    Search stocks using natural language query.

    Args:
        db: Database session
        query: Natural language search query
        limit: Maximum number of results

    Returns:
        SearchResponse with results or error
    """
    try:
        # Check cache first
        cached_sql = query_cache.get(query, limit)
        cache_hit = cached_sql is not None
        
        if cached_sql:
            generated_sql = cached_sql
            print(f"[Cache HIT] Query: '{query[:50]}...' -> Using cached SQL")
        else:
            # Generate SQL from natural language (LLM call)
            generated_sql = generate_sql_from_query(query, limit)
            # Cache the result for future queries
            query_cache.set(query, limit, generated_sql)
            print(f"[Cache MISS] Query: '{query[:50]}...' -> Generated and cached SQL")

        # Execute the query
        results = execute_sql(db, generated_sql)

        # Convert to StockResult objects
        stock_results = []
        for row in results:
            stock_results.append(StockResult(**row))

        return SearchResponse(
            success=True,
            results=stock_results,
            result_count=len(stock_results),
            generated_sql=generated_sql,
            cache_hit=cache_hit
        )

    except SQLValidationError as e:
        # SQL validation failed - try with fallback query
        try:
            fallback_sql = f"SELECT * FROM stocks LIMIT {limit}"
            results = execute_sql(db, fallback_sql)
            stock_results = [StockResult(**row) for row in results]

            return SearchResponse(
                success=True,
                results=stock_results,
                result_count=len(stock_results),
                generated_sql=fallback_sql,
                cache_hit=False,
                error=f"Original query failed validation: {str(e)}"
            )
        except Exception as fallback_error:
            return SearchResponse(
                success=False,
                results=[],
                result_count=0,
                error=f"Search failed: {str(fallback_error)}"
            )

    except Exception as e:
        return SearchResponse(
            success=False,
            results=[],
            result_count=0,
            error=f"Search failed: {str(e)}"
        )
