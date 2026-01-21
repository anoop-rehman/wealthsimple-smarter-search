from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import search, stocks

app = FastAPI(
    title="Stock Search API",
    description="Natural language stock search with real-time data",
    version="1.0.0"
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


@app.get("/health")
def health_check():
    return {"status": "healthy"}
