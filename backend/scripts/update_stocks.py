#!/usr/bin/env python3
"""Update stock prices from Yahoo Finance."""

import sys
import argparse
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services.stock_update_service import update_all_stocks, update_stock_from_yahoo
from app.models.stock import Stock


def main():
    parser = argparse.ArgumentParser(description='Update stock prices from Yahoo Finance')
    parser.add_argument('--tsx-only', action='store_true', help='Only update TSX stocks')
    parser.add_argument('--ticker', type=str, help='Update a specific ticker')
    parser.add_argument('--list', action='store_true', help='List all stocks in database')
    args = parser.parse_args()

    db = SessionLocal()

    try:
        if args.list:
            stocks = db.query(Stock).order_by(Stock.exchange, Stock.ticker).all()
            print(f"\n{'Ticker':<10} {'Exchange':<10} {'Name':<40} {'Price':<12} {'Change':<10}")
            print("-" * 85)
            for stock in stocks:
                price = f"${float(stock.current_price):.2f}" if stock.current_price else "-"
                change = f"{float(stock.day_change_percent):+.2f}%" if stock.day_change_percent else "-"
                name = (stock.stock_name[:37] + "...") if len(stock.stock_name or '') > 40 else (stock.stock_name or '-')
                print(f"{stock.ticker:<10} {stock.exchange or '-':<10} {name:<40} {price:<12} {change:<10}")
            print(f"\nTotal: {len(stocks)} stocks")
            return

        if args.ticker:
            # Update specific ticker
            stock = db.query(Stock).filter(Stock.ticker == args.ticker.upper()).first()
            if not stock:
                print(f"Stock {args.ticker.upper()} not found in database")
                return

            # Determine Yahoo ticker
            if stock.exchange in ('TSX', 'TOR', 'Toronto'):
                yahoo_ticker = f"{stock.ticker}.TO"
            elif stock.exchange in ('TSXV', 'TSX-V'):
                yahoo_ticker = f"{stock.ticker}.V"
            else:
                yahoo_ticker = stock.ticker

            print(f"Updating {stock.ticker} ({yahoo_ticker})...")
            if update_stock_from_yahoo(db, stock.ticker, yahoo_ticker):
                print("Success!")
            else:
                print("Failed to update")
            return

        # Update all stocks
        print("Updating all stocks...")
        print("=" * 50)

        if args.tsx_only:
            print("(TSX stocks only)")

        result = update_all_stocks(db, tsx_only=args.tsx_only)

        print("\n" + "=" * 50)
        print(f"Completed! Updated {result['success']} stocks, {result['failed']} failed")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
