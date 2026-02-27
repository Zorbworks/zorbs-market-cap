# Zorbs Market Cap

Dashboard-style market cap tracker for Zorbs by ZORA with historical data and charts.

## Features

- Live market cap, floor price, supply
- 1H / 24H / 7D percentage changes
- Floor price chart (7 days)
- Random Zorb backgrounds (cycles every minute)
- Auto-updates every 30 seconds

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Note:** Historical data (charts, percentage changes) won't work locally — they require Vercel KV which only runs on Vercel.

---

## Deploy to Vercel (Full Features)

### Step 1: Push to GitHub

1. Create a new repo on GitHub
2. Push this folder to it

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your repo
3. Add environment variable:
   - `ALCHEMY_API_KEY` = your Alchemy key
4. Deploy

### Step 3: Add Vercel KV (for historical data)

1. In your Vercel project dashboard, go to **Storage**
2. Click **Create Database** → Select **KV**
3. Name it anything (e.g., `zorbs-kv`)
4. Click **Create**
5. It will auto-connect and add the env variables

### Step 4: Redeploy

After adding KV, redeploy for changes to take effect:
- Go to **Deployments** → Click the three dots on latest → **Redeploy**

---

## How it works

- `/api/floor` — Fetches current data, logs to KV
- `/api/history` — Returns historical data and calculates % changes
- `/api/zorb` — Returns most recently transferred Zorb (or random fallback)
- `/api/backfill` — One-time import of historical data from Dune
- Cron job runs every 15 minutes to log prices (configured in `vercel.json`)

---

## Backfill Historical Data (Optional)

To populate historical floor price data instead of waiting:

### Step 1: Create a Dune Query

1. Go to [dune.com](https://dune.com) and sign in
2. Click **New Query**
3. Paste this SQL:

```sql
SELECT
  date_trunc('day', block_time) as day,
  MIN(amount_raw / 1e18) as floor_price
FROM nft.trades
WHERE nft_contract_address = 0xca21d4228cdcc68d4e23807e5e370c07577dd152
  AND amount_raw > 0
  AND block_time >= NOW() - INTERVAL '365' DAY
GROUP BY 1
ORDER BY 1 ASC
```

4. Click **Save** and give it a name
5. Copy the query ID from the URL (e.g., `dune.com/queries/123456` → ID is `123456`)

### Step 2: Get Your Dune API Key

1. Go to [dune.com/settings/api](https://dune.com/settings/api)
2. Create an API key

### Step 3: Run the Backfill

Visit this URL (replace with your values):

```
https://your-app.vercel.app/api/backfill?dune_key=YOUR_DUNE_KEY&query_id=YOUR_QUERY_ID
```

This takes 1-2 minutes. You'll see a success message with how many days were imported.

---

## Notes

- Percentage changes show "—" until enough data is collected
- Chart appears after 2+ data points
- KV automatically cleans data older than 7 days

