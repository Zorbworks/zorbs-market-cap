# Zorbs Market Cap

Live market capitalization tracker for [Zorbs](https://opensea.io/collection/zorbs-eth) by ZORA.

## Features

- **Real-time Market Cap** — Floor price × total supply, updated every 30 seconds
- **Historical Chart** — Floor price history with 7H, 7D, 7W, 77D time periods
- **Price Change Indicators** — Percentage changes for each time period
- **Last Transfer Display** — Shows most recent Zorb transfer with ENS resolution
- **Dark/Light Mode** — Toggle between themes
- **Dynamic OG Image** — Social embeds show live market cap data
- **Outlier Filtering** — Removes price spikes from wash trades

## Tech Stack

- **Next.js 14** — React framework
- **Vercel KV** — Redis-based historical data storage
- **Alchemy API** — Floor price, transfers, and NFT metadata
- **Recharts** — Chart visualization
- **@vercel/og** — Dynamic Open Graph images

## Environment Variables

Create a `.env.local` file:

```env
ALCHEMY_API_KEY=your_alchemy_api_key

# Vercel KV (auto-populated when you add KV storage in Vercel)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/floor` | Current floor price, market cap, and supply |
| `/api/history` | Historical data with price changes |
| `/api/zorb` | Latest transfer info with ENS lookup |
| `/api/og` | Dynamic OG image for social embeds |
| `/api/backfill` | Import historical data from Dune Analytics |

## Time Periods

- **7H** — 7 hours
- **7D** — 7 days
- **7W** — 7 weeks (49 days)
- **77D** — 77 days
- **777D** — 777 days

## Deployment

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/zorbs-market-cap)

### 2. Add Environment Variables

In Vercel dashboard:
- Add `ALCHEMY_API_KEY`
- Add Vercel KV storage (automatically sets KV variables)

### 3. Enable Cron Job

The `vercel.json` includes a cron job that updates floor price every 15 minutes:

```json
{
  "crons": [
    {
      "path": "/api/floor",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Note: Cron jobs require Vercel Pro plan.

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Data Sources

- **Floor Price** — Alchemy NFT API (OpenSea data)
- **Transfers** — Alchemy Asset Transfers API
- **ENS Names** — On-chain reverse lookup
- **Historical Data** — Vercel KV (Redis)

## Contract

Zorbs: `0xca21d4228cdcc68d4e23807e5e370c07577dd152`

## License

MIT
