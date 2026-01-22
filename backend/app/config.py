import os
from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    """Get database URL from environment, constructing it if needed."""
    # First, try DATABASE_URL directly
    if db_url := os.getenv("DATABASE_URL"):
        return db_url
    
    # If not found, try constructing from PG* variables (Railway style)
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_database = os.getenv("PGDATABASE")
    
    if all([pg_host, pg_user, pg_password, pg_database]):
        return f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
    
    # Fallback to localhost for development
    return "postgresql://postgres:postgres@localhost:5432/stock_trading"


class Settings:
    DATABASE_URL: str = get_database_url()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5173,https://anoop-rehman.github.io"
    ).split(",")


settings = Settings()
