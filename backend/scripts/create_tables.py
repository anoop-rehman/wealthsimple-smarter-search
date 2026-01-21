#!/usr/bin/env python3
"""Create database tables."""

import sys
sys.path.insert(0, '.')

from app.database import engine, Base
from app.models.stock import Stock

def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    # Print the SQL that would be generated
    print("\nGenerated SQL:")
    from sqlalchemy.schema import CreateTable
    print(CreateTable(Stock.__table__).compile(engine))

if __name__ == "__main__":
    create_tables()
