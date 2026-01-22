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
        print("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Warning: Could not initialize database tables: {e}")
    
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
