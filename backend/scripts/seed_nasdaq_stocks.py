#!/usr/bin/env python3
"""Seed top NASDAQ stocks to the database."""

import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services.stock_update_service import add_stock_from_yahoo

# Top 50 NASDAQ stocks by market cap
NASDAQ_STOCKS = [
    # Mega Cap Tech
    ("AAPL", None),       # Apple
    ("MSFT", None),       # Microsoft
    ("GOOGL", None),      # Alphabet Class A
    ("GOOG", None),       # Alphabet Class C
    ("AMZN", None),       # Amazon
    ("NVDA", None),       # NVIDIA
    ("META", None),       # Meta Platforms
    ("TSLA", None),       # Tesla
    ("AVGO", None),       # Broadcom
    ("COST", None),       # Costco

    # Large Cap Tech
    ("ADBE", None),       # Adobe
    ("NFLX", None),       # Netflix
    ("AMD", None),        # AMD
    ("QCOM", None),       # Qualcomm
    ("INTC", None),       # Intel
    ("CSCO", None),       # Cisco
    ("TXN", None),        # Texas Instruments
    ("INTU", None),       # Intuit
    ("AMAT", None),       # Applied Materials
    ("MU", None),         # Micron

    # Communication Services
    ("CMCSA", None),      # Comcast
    ("TMUS", None),       # T-Mobile
    ("CHTR", None),       # Charter Communications
    ("ATVI", None),       # Activision Blizzard (now MSFT)
    ("EA", None),         # Electronic Arts

    # Consumer
    ("PEP", None),        # PepsiCo
    ("SBUX", None),       # Starbucks
    ("MDLZ", None),       # Mondelez
    ("MNST", None),       # Monster Beverage
    ("KDP", None),        # Keurig Dr Pepper
    ("LULU", None),       # Lululemon
    ("ROST", None),       # Ross Stores
    ("DLTR", None),       # Dollar Tree
    ("EBAY", None),       # eBay
    ("MAR", None),        # Marriott

    # Healthcare/Biotech
    ("AMGN", None),       # Amgen
    ("GILD", None),       # Gilead Sciences
    ("VRTX", None),       # Vertex Pharmaceuticals
    ("REGN", None),       # Regeneron
    ("MRNA", None),       # Moderna
    ("BIIB", None),       # Biogen
    ("ILMN", None),       # Illumina
    ("DXCM", None),       # DexCom
    ("ISRG", None),       # Intuitive Surgical
    ("IDXX", None),       # IDEXX Laboratories

    # Financial/Other
    ("PYPL", None),       # PayPal
    ("ADP", None),        # ADP
    ("PAYX", None),       # Paychex
    ("CRWD", None),       # CrowdStrike
    ("PANW", None),       # Palo Alto Networks
]


def seed_nasdaq_stocks():
    """Add NASDAQ stocks to the database."""
    print("Seeding NASDAQ stocks...")
    print("=" * 50)

    db = SessionLocal()
    success_count = 0
    failure_count = 0

    try:
        for ticker, yahoo_ticker in NASDAQ_STOCKS:
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
    seed_nasdaq_stocks()
