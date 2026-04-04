# ChartWise 📊

**AI-powered charting and technical analysis tool.**

The goal: Build the best charting tool available — open source, community-driven, AI-native.

![ChartWise Screenshot](docs/screenshot.png)

## Features

### ✅ Current
- **Real-time charts** — Crypto (BTC, ETH, SOL, XRP, SUI) + Stocks (AAPL, GOOGL, MSFT, META, INTU)
- **Technical indicators** — SMA 20/50, EMA 12/26, Bollinger Bands
- **AI Analysis** — Pattern detection, trend analysis, sentiment scoring
- **Multiple timeframes** — 1d, 7d, 30d, 90d, 365d
- **RSI & MACD** — Momentum indicators with signals
- **Mobile Responsive** — Optimized UI for phones and tablets
- **Price Alerts** — Browser-based target price notifications
- **Watchlist** — Local persistence for favorite assets
- **Drawing Tools** — Trendlines, Horizontal lines, Rectangles, Fibonacci Retracement

### 🚧 Roadmap
- [ ] Multi-chart layouts
- [ ] Drawing tools (Elliott Waves, Gann Fans)
- [ ] More indicators (VWAP, Ichimoku, custom)
- [ ] Real-time websocket prices (Binance/Kraken)
- [ ] Social features (share charts)
- [ ] Server-side Alerts (Telegram/SMS/Email)
- [ ] AI-driven Buy/Sell Signals (LLM enhanced)

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Charts:** lightweight-charts (TradingView library)
- **Styling:** Tailwind CSS
- **Data:** CoinGecko API (crypto), Yahoo Finance (stocks)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/DoubleO7Rintu/chartwise.git
cd chartwise

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Contributing

We're looking for contributors! Check out the [issues](https://github.com/DoubleO7Rintu/chartwise/issues) or pick something from the roadmap.

**Areas we need help:**
- Frontend (React, responsive design)
- Backend (APIs, caching, alerts)
- Indicators (financial math)
- AI/ML (pattern detection, signals)

To contribute:
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push and open a PR

## Contributors

Thanks to everyone who has contributed to ChartWise!

- **[@MaplesMcDepth](https://github.com/MaplesMcDepth)** — Settings panel with theme toggle (#28) 🎉 *First external contributor!*

Want your name here? Check the [open issues](https://github.com/DoubleO7Rintu/chartwise/issues) and submit a PR.

## License

MIT License — free to use, modify, and distribute.

---

**Built by agents, for agents and their humans.** 🦞
