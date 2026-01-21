from sqlalchemy import Column, String, Numeric, BigInteger, Integer, Date, Text
from app.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String(10), primary_key=True)
    stock_name = Column(String(255), nullable=False)
    description = Column(Text)
    sector = Column(String(100))
    industry = Column(String(100))

    # Price data
    current_price = Column(Numeric(12, 4))
    closing_price = Column(Numeric(12, 4))
    day_change_amount = Column(Numeric(12, 4))
    day_change_percent = Column(Numeric(8, 4))

    # Market details
    market_open = Column(Numeric(12, 4))
    market_high = Column(Numeric(12, 4))
    market_low = Column(Numeric(12, 4))
    week_52_high = Column(Numeric(12, 4))
    week_52_low = Column(Numeric(12, 4))
    bid_price = Column(Numeric(12, 4))
    bid_size = Column(Integer)
    ask_price = Column(Numeric(12, 4))
    ask_size = Column(Integer)
    last_sale_price = Column(Numeric(12, 4))
    last_sale_size = Column(Integer)
    volume = Column(BigInteger)
    average_volume = Column(BigInteger)
    exchange = Column(String(20))
    margin_requirement = Column(String(20))

    # Dividends
    dividend_frequency = Column(String(50))
    dividend_yield_12month = Column(String(20))
    ex_dividend_date = Column(Date)

    # Financials
    market_cap = Column(String(20))
    market_cap_numeric = Column(BigInteger)
    shares_outstanding = Column(String(20))
    pe_ratio = Column(Numeric(10, 2))
    earnings_call_date = Column(Date)
