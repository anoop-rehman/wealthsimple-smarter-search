import os
from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    """Get database URL from environment, constructing it if needed."""
    import sys
    
    # Check if we're running locally (not in Railway)
    # Railway sets RAILWAY_ENVIRONMENT or RAILWAY_PROJECT_ID
    is_railway = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("RAILWAY_PROJECT_ID") is not None
    db_url_env = os.getenv("DATABASE_URL")
    
    # If DATABASE_URL contains "railway" but we're not in Railway environment, ignore it
    # This handles the case where Railway CLI sets DATABASE_URL in local shell
    if db_url_env and "railway" in db_url_env.lower() and not is_railway:
        print(f"[DEBUG] Ignoring Railway DATABASE_URL (running locally), reading from .env file")
        # Read directly from .env file to bypass shell environment
        from dotenv import dotenv_values
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        if os.path.exists(env_file):
            env_vars = dotenv_values(env_file)
            db_url_env = env_vars.get("DATABASE_URL")
        else:
            db_url_env = None
    
    # First, try DATABASE_URL directly (if not Railway URL when running locally)
    if db_url_env and "railway" not in db_url_env.lower():
        print(f"[DEBUG] Using DATABASE_URL from environment")
        return db_url_env
    
    # If not found, try constructing from PG* variables (Railway style)
    # But ignore Railway PG* variables when running locally
    pg_host = os.getenv("PGHOST")
    
    # If PGHOST contains "railway", we're likely running locally with Railway CLI env vars
    # Always prefer .env file in this case
    if pg_host and "railway" in pg_host.lower():
        print(f"[DEBUG] Detected Railway PGHOST={pg_host} (running locally), reading from .env file")
        # Read directly from .env file to bypass shell environment
        from dotenv import dotenv_values
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        print(f"[DEBUG] Looking for .env file at: {env_file}")
        print(f"[DEBUG] .env file exists: {os.path.exists(env_file)}")
        if os.path.exists(env_file):
            env_vars = dotenv_values(env_file)
            db_url_env = env_vars.get("DATABASE_URL")
            print(f"[DEBUG] DATABASE_URL from .env: {db_url_env.split('@')[-1] if db_url_env and '@' in db_url_env else db_url_env}")
            if db_url_env:
                print(f"[DEBUG] Using DATABASE_URL from .env file")
                return db_url_env
        # If no DATABASE_URL in .env, fall through to localhost fallback
        print(f"[DEBUG] No DATABASE_URL in .env, using localhost fallback")
        return "postgresql://postgres:postgres@localhost:5432/stock_trading"
    
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
