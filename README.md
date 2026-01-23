# Wealthsimple Smarter Search

Search for stocks in plain English.

Try it out: https://anoop-rehman.github.io/wealthsimple-smarter-search

## 🚀 Features

- **AI-Powered Natural Language Search**: Query stocks using natural language (e.g., "Healthcare stocks with earnings calls in the next week", "Large cap technology stocks")
- **Relatively Up-To-Date Stock Data**: Automatic updates every 15 minutes from Yahoo Finance
- **Stock Detail Pages**: Comprehensive stock information including price, market cap, P/E ratio, earnings dates, and more
- **Starred Stocks**: Save and track your favorite stocks
- **Query Caching**: Intelligent caching system for faster search responses
- **Multi-Exchange Support**: 150+ stocks across NASDAQ, NYSE, and TSX
- **Modern UI**: Sleek interface with interactive animations

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Relational database
- **yfinance** - Yahoo Finance data integration
- **Claude Sonnet 4.5** - LLM for natural language to SQL conversion
- **APScheduler** - Background job scheduling for stock updates

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Three.js / React Three Fiber** - 3D animations and effects
- **Matter.js** - Physics-based animations

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # API endpoints
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   ├── config.py           # Configuration
│   │   ├── database.py          # Database setup
│   │   └── main.py              # FastAPI app
│   ├── scripts/                 # Utility scripts
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React contexts
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript types
│   └── package.json             # Node dependencies
└── .github/
    └── workflows/               # CI/CD pipelines
```

## 🏃 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- API keys for either:
  - Google Gemini API, or
  - Anthropic Claude API

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stock_trading
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   CORS_ORIGINS=http://localhost:5173
   ```

5. **Set up the database:**
   ```bash
   # Create the database
   createdb stock_trading

   # Run migrations to create tables
   python scripts/create_tables.py

   # Seed the database with stock data
   python scripts/seed_nasdaq_stocks.py
   python scripts/seed_nyse_stocks.py
   python scripts/seed_tsx_stocks.py
   ```

6. **Run the backend server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_LOGO_DEV_TOKEN=your_logo_dev_token_here  # Optional, for stock logos
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## 📊 Database Schema

The main `stocks` table includes:
- Basic info: `ticker`, `stock_name`, `description`, `sector`, `industry`, `exchange`
- Price data: `current_price`, `closing_price`, `day_change_amount`, `day_change_percent`
- Market data: `market_open`, `market_high`, `market_low`, `volume`, `average_volume`
- Financial metrics: `market_cap`, `pe_ratio`, `dividend_yield_12month`
- Dates: `earnings_call_date`, `ex_dividend_date`

## 🔌 API Endpoints

### Search
- `POST /api/v1/search` - Natural language stock search
- `GET /api/v1/search?query=...&limit=50` - Search via GET request

### Stocks
- `GET /api/v1/stocks` - List all stocks
- `GET /api/v1/stocks/{ticker}` - Get stock details

### Cache Management
- `GET /api/v1/cache/stats` - Get cache statistics
- `POST /api/v1/cache/clear` - Clear the query cache
- `POST /api/v1/cache/warm` - Pre-warm cache with common queries

### Scheduler
- `POST /api/v1/scheduler/update-stocks` - Manually trigger stock update
- `GET /api/v1/scheduler/status` - Get scheduler status

## 🔄 Background Jobs

The application automatically updates stock data every 15 minutes using APScheduler. The scheduler:
- Fetches latest price data from Yahoo Finance
- Updates market metrics (volume, market cap, P/E ratio, etc.)
- Retrieves earnings call dates
- Calculates day change percentages

## 🚢 Deployment

### Backend (Railway)

The backend is configured for deployment on Railway:
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically detect and deploy the FastAPI application

### Frontend (GitHub Pages)

The frontend is automatically deployed to GitHub Pages via GitHub Actions:
1. Push to the `main` branch
2. The workflow builds and deploys the frontend
3. The app is available at: `https://your-username.github.io/wealthsimple-smarter-search`

## 🧪 Development

### Running Database Scripts

```bash
# Update all stocks manually
python scripts/update_stocks.py

# Seed specific exchanges
python scripts/seed_nasdaq_stocks.py
python scripts/seed_nyse_stocks.py
python scripts/seed_tsx_stocks.py
```

### Frontend Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📝 Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key (optional, if using Gemini)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (optional, if using Claude)
- `CORS_ORIGINS` - Comma-separated list of allowed CORS origins

### Frontend
- `VITE_API_URL` - Backend API URL
- `VITE_LOGO_DEV_TOKEN` - Logo.dev API token (optional, for stock logos)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is not affiliated with Wealthsimple or any of its affiliates, subsidiaries, or partners. This is an independent project created for demonstration purposes.