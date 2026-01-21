#!/usr/bin/env python3
"""Seed the database with 50 stocks."""

import sys
sys.path.insert(0, '.')

from datetime import date, timedelta
from decimal import Decimal
import random

from app.database import SessionLocal
from app.models.stock import Stock

# Stock data organized by sector
STOCK_DATA = [
    # Healthcare (8 stocks)
    {"ticker": "UNH", "stock_name": "UnitedHealth Group Inc", "sector": "Healthcare", "industry": "Health Insurance", "current_price": Decimal("523.45"), "market_cap_numeric": 485000000000, "pe_ratio": Decimal("21.5")},
    {"ticker": "JNJ", "stock_name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("156.78"), "market_cap_numeric": 378000000000, "pe_ratio": Decimal("15.2")},
    {"ticker": "PFE", "stock_name": "Pfizer Inc", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("28.34"), "market_cap_numeric": 160000000000, "pe_ratio": Decimal("12.8")},
    {"ticker": "ABBV", "stock_name": "AbbVie Inc", "sector": "Healthcare", "industry": "Biotechnology", "current_price": Decimal("174.56"), "market_cap_numeric": 308000000000, "pe_ratio": Decimal("45.3")},
    {"ticker": "MRK", "stock_name": "Merck & Co Inc", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("125.89"), "market_cap_numeric": 319000000000, "pe_ratio": Decimal("105.2")},
    {"ticker": "LLY", "stock_name": "Eli Lilly and Company", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": Decimal("758.23"), "market_cap_numeric": 720000000000, "pe_ratio": Decimal("118.5")},
    {"ticker": "GEHC", "stock_name": "GE HealthCare Technologies Inc", "sector": "Healthcare", "industry": "Medical Devices", "current_price": Decimal("82.45"), "market_cap_numeric": 38000000000, "pe_ratio": Decimal("22.1")},
    {"ticker": "CVS", "stock_name": "CVS Health Corporation", "sector": "Healthcare", "industry": "Healthcare Services", "current_price": Decimal("56.78"), "market_cap_numeric": 72000000000, "pe_ratio": Decimal("9.8")},

    # Technology (8 stocks)
    {"ticker": "AAPL", "stock_name": "Apple Inc", "sector": "Technology", "industry": "Consumer Electronics", "current_price": Decimal("189.34"), "market_cap_numeric": 2950000000000, "pe_ratio": Decimal("29.5")},
    {"ticker": "MSFT", "stock_name": "Microsoft Corporation", "sector": "Technology", "industry": "Software", "current_price": Decimal("378.92"), "market_cap_numeric": 2810000000000, "pe_ratio": Decimal("35.2")},
    {"ticker": "GOOGL", "stock_name": "Alphabet Inc", "sector": "Technology", "industry": "Internet Services", "current_price": Decimal("142.56"), "market_cap_numeric": 1790000000000, "pe_ratio": Decimal("24.8")},
    {"ticker": "NVDA", "stock_name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("495.67"), "market_cap_numeric": 1220000000000, "pe_ratio": Decimal("68.3")},
    {"ticker": "META", "stock_name": "Meta Platforms Inc", "sector": "Technology", "industry": "Social Media", "current_price": Decimal("356.78"), "market_cap_numeric": 920000000000, "pe_ratio": Decimal("26.4")},
    {"ticker": "AMD", "stock_name": "Advanced Micro Devices Inc", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("156.34"), "market_cap_numeric": 252000000000, "pe_ratio": Decimal("245.6")},
    {"ticker": "INTC", "stock_name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": Decimal("42.56"), "market_cap_numeric": 180000000000, "pe_ratio": Decimal("92.4")},
    {"ticker": "CRM", "stock_name": "Salesforce Inc", "sector": "Technology", "industry": "Software", "current_price": Decimal("268.45"), "market_cap_numeric": 261000000000, "pe_ratio": Decimal("47.8")},

    # Finance (6 stocks)
    {"ticker": "JPM", "stock_name": "JPMorgan Chase & Co", "sector": "Finance", "industry": "Banking", "current_price": Decimal("178.34"), "market_cap_numeric": 515000000000, "pe_ratio": Decimal("11.2")},
    {"ticker": "BAC", "stock_name": "Bank of America Corporation", "sector": "Finance", "industry": "Banking", "current_price": Decimal("34.56"), "market_cap_numeric": 272000000000, "pe_ratio": Decimal("10.5")},
    {"ticker": "WFC", "stock_name": "Wells Fargo & Company", "sector": "Finance", "industry": "Banking", "current_price": Decimal("52.78"), "market_cap_numeric": 188000000000, "pe_ratio": Decimal("11.8")},
    {"ticker": "GS", "stock_name": "Goldman Sachs Group Inc", "sector": "Finance", "industry": "Investment Banking", "current_price": Decimal("378.45"), "market_cap_numeric": 122000000000, "pe_ratio": Decimal("14.2")},
    {"ticker": "V", "stock_name": "Visa Inc", "sector": "Finance", "industry": "Payment Processing", "current_price": Decimal("278.56"), "market_cap_numeric": 556000000000, "pe_ratio": Decimal("29.8")},
    {"ticker": "MA", "stock_name": "Mastercard Incorporated", "sector": "Finance", "industry": "Payment Processing", "current_price": Decimal("445.67"), "market_cap_numeric": 415000000000, "pe_ratio": Decimal("35.6")},

    # Consumer Discretionary (5 stocks)
    {"ticker": "AMZN", "stock_name": "Amazon.com Inc", "sector": "Consumer Discretionary", "industry": "E-Commerce", "current_price": Decimal("178.45"), "market_cap_numeric": 1850000000000, "pe_ratio": Decimal("62.5")},
    {"ticker": "TSLA", "stock_name": "Tesla Inc", "sector": "Consumer Discretionary", "industry": "Electric Vehicles", "current_price": Decimal("245.67"), "market_cap_numeric": 780000000000, "pe_ratio": Decimal("72.3")},
    {"ticker": "HD", "stock_name": "The Home Depot Inc", "sector": "Consumer Discretionary", "industry": "Home Improvement", "current_price": Decimal("345.78"), "market_cap_numeric": 343000000000, "pe_ratio": Decimal("22.8")},
    {"ticker": "NKE", "stock_name": "NIKE Inc", "sector": "Consumer Discretionary", "industry": "Apparel", "current_price": Decimal("106.34"), "market_cap_numeric": 162000000000, "pe_ratio": Decimal("28.5")},
    {"ticker": "MCD", "stock_name": "McDonald's Corporation", "sector": "Consumer Discretionary", "industry": "Restaurants", "current_price": Decimal("289.56"), "market_cap_numeric": 210000000000, "pe_ratio": Decimal("24.6")},

    # Consumer Staples (5 stocks)
    {"ticker": "PG", "stock_name": "Procter & Gamble Company", "sector": "Consumer Staples", "industry": "Household Products", "current_price": Decimal("156.78"), "market_cap_numeric": 368000000000, "pe_ratio": Decimal("26.2")},
    {"ticker": "KO", "stock_name": "The Coca-Cola Company", "sector": "Consumer Staples", "industry": "Beverages", "current_price": Decimal("62.34"), "market_cap_numeric": 269000000000, "pe_ratio": Decimal("24.8")},
    {"ticker": "PEP", "stock_name": "PepsiCo Inc", "sector": "Consumer Staples", "industry": "Beverages", "current_price": Decimal("172.45"), "market_cap_numeric": 237000000000, "pe_ratio": Decimal("26.5")},
    {"ticker": "COST", "stock_name": "Costco Wholesale Corporation", "sector": "Consumer Staples", "industry": "Retail", "current_price": Decimal("578.23"), "market_cap_numeric": 256000000000, "pe_ratio": Decimal("42.8")},
    {"ticker": "WMT", "stock_name": "Walmart Inc", "sector": "Consumer Staples", "industry": "Retail", "current_price": Decimal("162.56"), "market_cap_numeric": 437000000000, "pe_ratio": Decimal("28.3")},

    # Energy (4 stocks)
    {"ticker": "XOM", "stock_name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("106.78"), "market_cap_numeric": 425000000000, "pe_ratio": Decimal("12.5")},
    {"ticker": "CVX", "stock_name": "Chevron Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("148.34"), "market_cap_numeric": 276000000000, "pe_ratio": Decimal("11.8")},
    {"ticker": "COP", "stock_name": "ConocoPhillips", "sector": "Energy", "industry": "Oil & Gas", "current_price": Decimal("112.56"), "market_cap_numeric": 132000000000, "pe_ratio": Decimal("10.2")},
    {"ticker": "SLB", "stock_name": "Schlumberger Limited", "sector": "Energy", "industry": "Oil Services", "current_price": Decimal("52.34"), "market_cap_numeric": 74000000000, "pe_ratio": Decimal("16.8")},

    # Industrials (4 stocks)
    {"ticker": "UNP", "stock_name": "Union Pacific Corporation", "sector": "Industrials", "industry": "Railroads", "current_price": Decimal("245.67"), "market_cap_numeric": 148000000000, "pe_ratio": Decimal("22.4")},
    {"ticker": "HON", "stock_name": "Honeywell International Inc", "sector": "Industrials", "industry": "Diversified Industrials", "current_price": Decimal("198.45"), "market_cap_numeric": 129000000000, "pe_ratio": Decimal("24.6")},
    {"ticker": "BA", "stock_name": "The Boeing Company", "sector": "Industrials", "industry": "Aerospace", "current_price": Decimal("212.34"), "market_cap_numeric": 128000000000, "pe_ratio": None},
    {"ticker": "CAT", "stock_name": "Caterpillar Inc", "sector": "Industrials", "industry": "Heavy Machinery", "current_price": Decimal("278.56"), "market_cap_numeric": 138000000000, "pe_ratio": Decimal("15.8")},

    # Communication (4 stocks)
    {"ticker": "NFLX", "stock_name": "Netflix Inc", "sector": "Communication", "industry": "Streaming", "current_price": Decimal("478.34"), "market_cap_numeric": 210000000000, "pe_ratio": Decimal("45.6")},
    {"ticker": "DIS", "stock_name": "The Walt Disney Company", "sector": "Communication", "industry": "Entertainment", "current_price": Decimal("92.45"), "market_cap_numeric": 169000000000, "pe_ratio": Decimal("68.2")},
    {"ticker": "CMCSA", "stock_name": "Comcast Corporation", "sector": "Communication", "industry": "Cable & Satellite", "current_price": Decimal("42.78"), "market_cap_numeric": 169000000000, "pe_ratio": Decimal("10.5")},
    {"ticker": "T", "stock_name": "AT&T Inc", "sector": "Communication", "industry": "Telecommunications", "current_price": Decimal("17.56"), "market_cap_numeric": 126000000000, "pe_ratio": Decimal("8.2")},

    # Materials (3 stocks)
    {"ticker": "LIN", "stock_name": "Linde plc", "sector": "Materials", "industry": "Industrial Gases", "current_price": Decimal("412.34"), "market_cap_numeric": 198000000000, "pe_ratio": Decimal("32.5")},
    {"ticker": "APD", "stock_name": "Air Products and Chemicals Inc", "sector": "Materials", "industry": "Industrial Gases", "current_price": Decimal("278.56"), "market_cap_numeric": 62000000000, "pe_ratio": Decimal("26.8")},
    {"ticker": "FCX", "stock_name": "Freeport-McMoRan Inc", "sector": "Materials", "industry": "Mining", "current_price": Decimal("42.34"), "market_cap_numeric": 61000000000, "pe_ratio": Decimal("28.5")},

    # Utilities (3 stocks)
    {"ticker": "NEE", "stock_name": "NextEra Energy Inc", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("72.34"), "market_cap_numeric": 148000000000, "pe_ratio": Decimal("22.4")},
    {"ticker": "DUK", "stock_name": "Duke Energy Corporation", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("98.56"), "market_cap_numeric": 76000000000, "pe_ratio": Decimal("18.6")},
    {"ticker": "SO", "stock_name": "The Southern Company", "sector": "Utilities", "industry": "Electric Utilities", "current_price": Decimal("72.45"), "market_cap_numeric": 79000000000, "pe_ratio": Decimal("20.2")},
]


def format_market_cap(value: int) -> str:
    """Format market cap as human readable string."""
    if value >= 1_000_000_000_000:
        return f"${value / 1_000_000_000_000:.2f}T"
    elif value >= 1_000_000_000:
        return f"${value / 1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    return f"${value}"


def generate_stock_data():
    """Generate complete stock data with computed fields."""
    stocks = []
    today = date.today()

    for i, stock_base in enumerate(STOCK_DATA):
        # Generate random variations for market data
        current_price = stock_base["current_price"]
        day_change_pct = Decimal(str(random.uniform(-3.5, 3.5)))
        day_change_amt = current_price * day_change_pct / 100
        closing_price = current_price - day_change_amt

        # Generate earnings call dates spread over next 30 days
        earnings_offset = random.randint(1, 30)
        earnings_date = today + timedelta(days=earnings_offset)

        # Ex-dividend date in the past or future
        ex_div_offset = random.randint(-30, 60)
        ex_div_date = today + timedelta(days=ex_div_offset)

        stock = Stock(
            ticker=stock_base["ticker"],
            stock_name=stock_base["stock_name"],
            description=f"{stock_base['stock_name']} is a leading company in the {stock_base['industry']} industry.",
            sector=stock_base["sector"],
            industry=stock_base["industry"],
            current_price=current_price,
            closing_price=closing_price,
            day_change_amount=round(day_change_amt, 4),
            day_change_percent=round(day_change_pct, 4),
            market_open=current_price * Decimal(str(random.uniform(0.98, 1.02))),
            market_high=current_price * Decimal(str(random.uniform(1.01, 1.03))),
            market_low=current_price * Decimal(str(random.uniform(0.97, 0.99))),
            week_52_high=current_price * Decimal(str(random.uniform(1.1, 1.4))),
            week_52_low=current_price * Decimal(str(random.uniform(0.6, 0.9))),
            bid_price=current_price - Decimal("0.01"),
            bid_size=random.randint(100, 1000),
            ask_price=current_price + Decimal("0.01"),
            ask_size=random.randint(100, 1000),
            last_sale_price=current_price,
            last_sale_size=random.randint(50, 500),
            volume=random.randint(1000000, 50000000),
            average_volume=random.randint(5000000, 30000000),
            exchange="NASDAQ" if i % 2 == 0 else "NYSE",
            margin_requirement="100%",
            dividend_frequency="Quarterly" if random.random() > 0.2 else "Annual",
            dividend_yield_12month=f"{random.uniform(0.5, 4.0):.2f}%",
            ex_dividend_date=ex_div_date,
            market_cap=format_market_cap(stock_base["market_cap_numeric"]),
            market_cap_numeric=stock_base["market_cap_numeric"],
            shares_outstanding=f"{stock_base['market_cap_numeric'] // int(current_price):,}",
            pe_ratio=stock_base["pe_ratio"],
            earnings_call_date=earnings_date,
        )
        stocks.append(stock)

    return stocks


def seed_database():
    """Seed the database with stock data."""
    print("Seeding database with stock data...")

    db = SessionLocal()
    try:
        # Clear existing data
        db.query(Stock).delete()
        db.commit()

        # Generate and insert stock data
        stocks = generate_stock_data()
        for stock in stocks:
            db.add(stock)

        db.commit()
        print(f"Successfully seeded {len(stocks)} stocks!")

        # Print summary by sector
        print("\nStocks by sector:")
        sectors = {}
        for stock in stocks:
            sectors[stock.sector] = sectors.get(stock.sector, 0) + 1
        for sector, count in sorted(sectors.items()):
            print(f"  {sector}: {count}")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
