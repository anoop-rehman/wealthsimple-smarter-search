#!/usr/bin/env python3
"""Seed top NYSE stocks to the database."""

import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services.stock_update_service import add_stock_from_yahoo

# Top 50 NYSE stocks by market cap
NYSE_STOCKS = [
    # Mega Cap
    ("BRK-B", None),      # Berkshire Hathaway
    ("V", None),          # Visa
    ("UNH", None),        # UnitedHealth
    ("JNJ", None),        # Johnson & Johnson
    ("WMT", None),        # Walmart
    ("JPM", None),        # JPMorgan Chase
    ("MA", None),         # Mastercard
    ("XOM", None),        # Exxon Mobil
    ("PG", None),         # Procter & Gamble
    ("HD", None),         # Home Depot

    # Large Cap Financials
    ("BAC", None),        # Bank of America
    ("WFC", None),        # Wells Fargo
    ("GS", None),         # Goldman Sachs
    ("MS", None),         # Morgan Stanley
    ("C", None),          # Citigroup
    ("BLK", None),        # BlackRock
    ("SCHW", None),       # Charles Schwab
    ("AXP", None),        # American Express
    ("CB", None),         # Chubb
    ("MMC", None),        # Marsh & McLennan

    # Healthcare
    ("LLY", None),        # Eli Lilly
    ("MRK", None),        # Merck
    ("ABBV", None),       # AbbVie
    ("PFE", None),        # Pfizer
    ("TMO", None),        # Thermo Fisher
    ("ABT", None),        # Abbott Labs
    ("DHR", None),        # Danaher
    ("BMY", None),        # Bristol-Myers Squibb
    ("CVS", None),        # CVS Health
    ("CI", None),         # Cigna

    # Energy
    ("CVX", None),        # Chevron
    ("COP", None),        # ConocoPhillips
    ("SLB", None),        # Schlumberger
    ("EOG", None),        # EOG Resources
    ("OXY", None),        # Occidental Petroleum

    # Industrial
    ("CAT", None),        # Caterpillar
    ("HON", None),        # Honeywell
    ("UNP", None),        # Union Pacific
    ("BA", None),         # Boeing
    ("GE", None),         # GE Aerospace
    ("RTX", None),        # RTX (Raytheon)
    ("DE", None),         # Deere & Company
    ("LMT", None),        # Lockheed Martin
    ("MMM", None),        # 3M

    # Consumer
    ("KO", None),         # Coca-Cola
    ("MCD", None),        # McDonald's
    ("DIS", None),        # Disney
    ("NKE", None),        # Nike
    ("LOW", None),        # Lowe's
    ("TGT", None),        # Target
]


def seed_nyse_stocks():
    """Add NYSE stocks to the database."""
    print("Seeding NYSE stocks...")
    print("=" * 50)

    db = SessionLocal()
    success_count = 0
    failure_count = 0

    try:
        for ticker, yahoo_ticker in NYSE_STOCKS:
            print(f"\nAdding {ticker}...")
            if add_stock_from_yahoo(db, ticker, yahoo_ticker):
                success_count += 1
            else:
                failure_count += 1

        print("\n" + "=" * 50)
        print(f"Completed! Added {success_count} stocks, {failure_count} failed")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_nyse_stocks()
