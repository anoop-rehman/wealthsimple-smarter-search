from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import search, stocks, scheduler
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    try:
        from app.database import Base, engine
        from app.models.stock import Stock
        from app.config import settings
        
        # Log database connection info (hide password)
        db_url_safe = settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL
        print(f"Connecting to database at: {db_url_safe}")
        print("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Warning: Could not initialize database tables: {e}")
        import traceback
        traceback.print_exc()
    
    # Startup: start the scheduler
    start_scheduler(interval_minutes=15)
    
    yield
    # Shutdown: stop the scheduler
    stop_scheduler()


app = FastAPI(
    title="Stock Search API",
    description="Natural language stock search with real-time data",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1")
app.include_router(stocks.router, prefix="/api/v1")
app.include_router(scheduler.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
