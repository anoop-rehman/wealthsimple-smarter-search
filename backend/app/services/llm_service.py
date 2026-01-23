"""LLM service for natural language to SQL conversion using Claude."""

import anthropic
from app.config import settings

# Configure Claude client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

SYSTEM_PROMPT = """You are a SQL query generator for a stock trading database.

Table: stocks
Columns:
- ticker (VARCHAR) - Stock ticker symbol (e.g., AAPL, MSFT)
- stock_name (VARCHAR) - Full company name
- description (TEXT) - Company description
- sector (VARCHAR) - Business sector
- industry (VARCHAR) - Specific industry
- current_price (DECIMAL) - Current stock price
- closing_price (DECIMAL) - Previous closing price
- day_change_amount (DECIMAL) - Price change in dollars
- day_change_percent (DECIMAL) - Price change as percentage
- market_open (DECIMAL) - Opening price
- market_high (DECIMAL) - Day's high price
- market_low (DECIMAL) - Day's low price
- week_52_high (DECIMAL) - 52-week high
- week_52_low (DECIMAL) - 52-week low
- bid_price (DECIMAL) - Current bid price
- bid_size (INTEGER) - Bid size
- ask_price (DECIMAL) - Current ask price
- ask_size (INTEGER) - Ask size
- last_sale_price (DECIMAL) - Last sale price
- last_sale_size (INTEGER) - Last sale size
- volume (BIGINT) - Trading volume
- average_volume (BIGINT) - Average volume
- exchange (VARCHAR) - Stock exchange (NASDAQ, NYSE)
- margin_requirement (VARCHAR) - Margin requirement
- dividend_frequency (VARCHAR) - Dividend payment frequency
- dividend_yield_12month (VARCHAR) - 12-month dividend yield
- ex_dividend_date (DATE) - Ex-dividend date
- market_cap (VARCHAR) - Market cap as formatted string
- market_cap_numeric (BIGINT) - Market cap as number in dollars
- shares_outstanding (VARCHAR) - Number of shares outstanding
- pe_ratio (DECIMAL) - Price-to-earnings ratio
- earnings_call_date (DATE) - Next earnings call date

Available sectors: Healthcare, Technology, Finance, Consumer Discretionary, Consumer Staples, Energy, Industrials, Communication, Materials, Utilities

Rules:
1. ONLY generate SELECT statements - never INSERT, UPDATE, DELETE, DROP, or any other statement type
2. For most queries, include a LIMIT clause (use the provided limit or default to 50)
3. EXCEPTION: For "all stocks", "show all", "list all stocks", or similar queries requesting ALL results, use the provided limit (which will be high like 500) to show all stocks
4. Use CURRENT_DATE for date calculations:
   - "next week" = earnings_call_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
   - "next month" = earnings_call_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
   - "this week" = earnings_call_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
5. For market cap queries:
   - "large cap" = market_cap_numeric >= 10000000000 (10 billion)
   - "mid cap" = market_cap_numeric BETWEEN 2000000000 AND 10000000000
   - "small cap" = market_cap_numeric < 2000000000
6. For price movement:
   - "up today" or "gainers" = day_change_percent > 0
   - "down today" or "losers" = day_change_percent < 0
7. Return ONLY the raw SQL query, no explanations, no markdown, no code blocks
8. Always use case-insensitive matching for sector and stock names (use ILIKE)
9. If the query is unclear or cannot be converted to SQL, return: SELECT * FROM stocks WHERE 1=0 LIMIT {limit}

Examples:
User: "Healthcare stocks with earnings calls in the next week"
SQL: SELECT * FROM stocks WHERE sector ILIKE '%Healthcare%' AND earnings_call_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' LIMIT 50

User: "Large cap technology stocks"
SQL: SELECT * FROM stocks WHERE sector ILIKE '%Technology%' AND market_cap_numeric >= 10000000000 LIMIT 50

User: "Show me the top gainers today"
SQL: SELECT * FROM stocks WHERE day_change_percent > 0 ORDER BY day_change_percent DESC LIMIT 50

User: "Stocks under $50"
SQL: SELECT * FROM stocks WHERE current_price < 50 LIMIT 50

User: "all stocks" or "show all stocks"
SQL: SELECT * FROM stocks LIMIT 500
"""


def generate_sql_from_query(natural_language_query: str, limit: int = 50) -> str:
    """Convert a natural language query to SQL using Claude."""
    if not client:
        # Fallback if no API key
        return f"SELECT * FROM stocks WHERE 1=0 LIMIT {limit}"

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f'User query: "{natural_language_query}"\nLimit: {limit}\n\nGenerate the SQL query:'
                }
            ]
        )

        if message.content and len(message.content) > 0:
            sql = message.content[0].text.strip()
            # Remove any markdown code blocks if present
            if sql.startswith("```"):
                lines = sql.split("\n")
                sql = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
            sql = sql.strip()
            # Remove trailing semicolon if present
            if sql.endswith(";"):
                sql = sql[:-1]
            return sql

        return f"SELECT * FROM stocks WHERE 1=0 LIMIT {limit}"

    except Exception as e:
        print(f"Error generating SQL with Claude: {e}")
        return f"SELECT * FROM stocks WHERE 1=0 LIMIT {limit}"
