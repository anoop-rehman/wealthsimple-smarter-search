import os
from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    """Get database URL from environment, constructing it if needed."""
    import sys
    
    # First, try DATABASE_URL directly
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        print(f"[DEBUG] Using DATABASE_URL from environment")
        return db_url
    
    # If not found, try constructing from PG* variables (Railway style)
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_database = os.getenv("PGDATABASE")
    
    print(f"[DEBUG] DATABASE_URL not found. Checking PG* variables:")
    print(f"[DEBUG]   PGHOST={pg_host}")
    print(f"[DEBUG]   PGPORT={pg_port}")
    print(f"[DEBUG]   PGUSER={pg_user}")
    print(f"[DEBUG]   PGDATABASE={pg_database}")
    print(f"[DEBUG]   PGPASSWORD={'***' if pg_password else None}")
    
    if all([pg_host, pg_user, pg_password, pg_database]):
        constructed_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        print(f"[DEBUG] Constructed DATABASE_URL from PG* variables")
        return constructed_url
    
    # Fallback to localhost for development
    print(f"[DEBUG] No database env vars found, using localhost fallback")
    return "postgresql://postgres:postgres@localhost:5432/stock_trading"


class Settings:
    DATABASE_URL: str = get_database_url()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5173,https://anoop-rehman.github.io,https://anoop-rehman.github.io/wealthsimple-ai-command-center"
    ).split(",")


settings = Settings()
