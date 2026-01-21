#!/usr/bin/env python3
"""Seed TSX (Toronto Stock Exchange) stocks to the database."""

import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services.stock_update_service import add_stock_from_yahoo

# Popular TSX stocks to add
# Format: (our_ticker, yahoo_ticker)
TSX_STOCKS = [
    # Big Banks (Financials)
    ("RY", "RY.TO"),      # Royal Bank of Canada
    ("TD", "TD.TO"),      # Toronto-Dominion Bank
    ("BNS", "BNS.TO"),    # Bank of Nova Scotia
    ("BMO", "BMO.TO"),    # Bank of Montreal
    ("CM", "CM.TO"),      # CIBC
    ("NA", "NA.TO"),      # National Bank of Canada

    # Insurance & Financial Services
    ("MFC", "MFC.TO"),    # Manulife Financial
    ("SLF", "SLF.TO"),    # Sun Life Financial
    ("IFC", "IFC.TO"),    # Intact Financial
    ("POW", "POW.TO"),    # Power Corporation

    # Energy
    ("ENB", "ENB.TO"),    # Enbridge
    ("TRP", "TRP.TO"),    # TC Energy
    ("CNQ", "CNQ.TO"),    # Canadian Natural Resources
    ("SU", "SU.TO"),      # Suncor Energy
    ("CVE", "CVE.TO"),    # Cenovus Energy
    ("IMO", "IMO.TO"),    # Imperial Oil

    # Telecoms
    ("BCE", "BCE.TO"),    # BCE Inc (Bell)
    ("T", "T.TO"),        # Telus - Note: conflicts with AT&T, using T.TO
    ("RCI-B", "RCI-B.TO"), # Rogers Communications

    # Railways & Transportation
    ("CNR", "CNR.TO"),    # Canadian National Railway
    ("CP", "CP.TO"),      # Canadian Pacific Kansas City

    # Mining & Materials
    ("ABX", "ABX.TO"),    # Barrick Gold
    ("NTR", "NTR.TO"),    # Nutrien
    ("FM", "FM.TO"),      # First Quantum Minerals
    ("TECK-B", "TECK-B.TO"), # Teck Resources

    # Consumer / Retail
    ("ATD", "ATD.TO"),    # Alimentation Couche-Tard
    ("L", "L.TO"),        # Loblaw Companies
    ("DOL", "DOL.TO"),    # Dollarama
    ("MRU", "MRU.TO"),    # Metro Inc
    ("QSR", "QSR.TO"),    # Restaurant Brands International

    # Technology
    ("SHOP", "SHOP.TO"),  # Shopify
    ("CSU", "CSU.TO"),    # Constellation Software
    ("OTEX", "OTEX.TO"),  # Open Text
    ("BB", "BB.TO"),      # BlackBerry

    # Real Estate
    ("BAM", "BAM.TO"),    # Brookfield Asset Management
    ("BN", "BN.TO"),      # Brookfield Corporation

    # Utilities
    ("FTS", "FTS.TO"),    # Fortis
    ("EMA", "EMA.TO"),    # Emera
    ("H", "H.TO"),        # Hydro One

    # Healthcare
    ("WSP", "WSP.TO"),    # WSP Global
]


def seed_tsx_stocks():
    """Add TSX stocks to the database."""
    print("Seeding TSX stocks...")
    print("=" * 50)

    db = SessionLocal()
    success_count = 0
    failure_count = 0

    try:
        for ticker, yahoo_ticker in TSX_STOCKS:
            print(f"\nAdding {ticker} ({yahoo_ticker})...")
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
    seed_tsx_stocks()
