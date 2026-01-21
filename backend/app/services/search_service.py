"""Search service that orchestrates LLM and SQL services."""

from sqlalchemy.orm import Session
from app.services.llm_service import generate_sql_from_query
from app.services.sql_service import execute_sql, SQLValidationError
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
        # Generate SQL from natural language
        generated_sql = generate_sql_from_query(query, limit)

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
            generated_sql=generated_sql
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
