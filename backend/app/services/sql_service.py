"""SQL validation and execution service with security measures."""

import re
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

# Forbidden SQL keywords/patterns for security
FORBIDDEN_PATTERNS = [
    r'\bINSERT\b',
    r'\bUPDATE\b',
    r'\bDELETE\b',
    r'\bDROP\b',
    r'\bCREATE\b',
    r'\bALTER\b',
    r'\bTRUNCATE\b',
    r'\bGRANT\b',
    r'\bREVOKE\b',
    r'\bEXEC\b',
    r'\bEXECUTE\b',
    r'\bUNION\b',
    r'\bINTO\b',
    r'--',  # SQL comments
    r';.*;',  # Multiple statements
    r'\bxp_\w+',  # SQL Server extended procedures
    r'\bsp_\w+',  # SQL Server stored procedures
]

# Required patterns for a valid query
REQUIRED_PATTERNS = [
    r'^\s*SELECT\b',  # Must start with SELECT
]


class SQLValidationError(Exception):
    """Exception raised when SQL validation fails."""
    pass


def validate_sql(sql: str) -> tuple[bool, Optional[str]]:
    """
    Validate SQL query for security.

    Returns:
        tuple: (is_valid, error_message)
    """
    sql_upper = sql.upper()

    # Check for forbidden patterns
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, sql_upper, re.IGNORECASE):
            return False, f"Forbidden SQL pattern detected: {pattern}"

    # Check for required patterns
    for pattern in REQUIRED_PATTERNS:
        if not re.search(pattern, sql_upper, re.IGNORECASE):
            return False, f"SQL must match pattern: {pattern}"

    # Ensure the query references the stocks table
    if 'STOCKS' not in sql_upper:
        return False, "Query must reference the stocks table"

    # Ensure there's a LIMIT clause
    if 'LIMIT' not in sql_upper:
        return False, "Query must include a LIMIT clause"

    return True, None


def sanitize_sql(sql: str, default_limit: int = 50) -> str:
    """
    Sanitize and normalize SQL query.

    Args:
        sql: The SQL query to sanitize
        default_limit: Default limit to add if missing

    Returns:
        Sanitized SQL query
    """
    # Remove leading/trailing whitespace
    sql = sql.strip()

    # Remove trailing semicolons
    sql = sql.rstrip(';')

    # Add LIMIT if missing
    if 'LIMIT' not in sql.upper():
        sql = f"{sql} LIMIT {default_limit}"

    return sql


def execute_sql(db: Session, sql: str, timeout_seconds: int = 5) -> list[dict]:
    """
    Execute a validated SQL query and return results.

    Args:
        db: Database session
        sql: SQL query to execute
        timeout_seconds: Query timeout in seconds

    Returns:
        List of dictionaries containing query results

    Raises:
        SQLValidationError: If SQL validation fails
        Exception: If query execution fails
    """
    # Validate the SQL
    is_valid, error = validate_sql(sql)
    if not is_valid:
        raise SQLValidationError(error)

    # Sanitize the SQL
    sql = sanitize_sql(sql)

    try:
        # Set statement timeout (PostgreSQL specific)
        db.execute(text(f"SET statement_timeout = '{timeout_seconds * 1000}'"))

        # Execute the query
        result = db.execute(text(sql))

        # Convert results to list of dicts
        columns = result.keys()
        rows = []
        for row in result.fetchall():
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Handle special types for JSON serialization
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif hasattr(value, '__float__'):
                    value = float(value)
                row_dict[col] = value
            rows.append(row_dict)

        # Reset timeout
        db.execute(text("SET statement_timeout = '0'"))

        return rows

    except Exception as e:
        # Reset timeout on error
        try:
            db.execute(text("SET statement_timeout = '0'"))
        except:
            pass
        raise e
