import os
from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    """Get database URL from environment, constructing it if needed."""
    
    # Check if we're running on Railway (they set these env vars)
    is_railway = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("RAILWAY_PROJECT_ID") is not None
    db_url_env = os.getenv("DATABASE_URL")
    
    print(f"[DEBUG] is_railway={is_railway}, DATABASE_URL set={db_url_env is not None}")
    
    # If running ON Railway, use DATABASE_URL directly (even if it contains "railway")
    if is_railway and db_url_env:
        print(f"[DEBUG] Running on Railway, using DATABASE_URL")
        return db_url_env
    
    # If running locally but DATABASE_URL contains "railway", it's from Railway CLI
    # Read from .env file instead to get local database
    if db_url_env and "railway" in db_url_env.lower():
        print(f"[DEBUG] Ignoring Railway DATABASE_URL (running locally), reading from .env file")
        from dotenv import dotenv_values
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        if os.path.exists(env_file):
            env_vars = dotenv_values(env_file)
            local_db_url = env_vars.get("DATABASE_URL")
            if local_db_url:
                print(f"[DEBUG] Using DATABASE_URL from .env file")
                return local_db_url
        print(f"[DEBUG] No DATABASE_URL in .env, using localhost fallback")
        return "postgresql://postgres:postgres@localhost:5432/stock_trading"
    
    # Use DATABASE_URL if set and doesn't contain "railway"
    if db_url_env:
        print(f"[DEBUG] Using DATABASE_URL from environment")
        return db_url_env
    
    # Try constructing from PG* variables (Railway style)
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_database = os.getenv("PGDATABASE")
    
    # If PGHOST contains "railway" but we're running locally, ignore
    if pg_host and "railway" in pg_host.lower() and not is_railway:
        print(f"[DEBUG] Ignoring Railway PG* vars (running locally)")
        return "postgresql://postgres:postgres@localhost:5432/stock_trading"
    
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
        "http://localhost:5173,https://anoop-rehman.github.io,https://anoop-rehman.github.io/wealthsimple-smarter-search"
    ).split(",")


settings = Settings()
