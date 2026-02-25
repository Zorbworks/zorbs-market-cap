# Zorbs Market Cap

Minimal market cap tracker for Zorbs by ZORA.

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

---

## Deploy to Vercel

### Option A: Via GitHub

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variable:
   - `ALCHEMY_API_KEY` = your Alchemy API key
4. Deploy

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel
```

When prompted, add your `ALCHEMY_API_KEY` as an environment variable in the Vercel dashboard.

---

## How it works

- `/api/floor` — Server-side API route that fetches floor price from Alchemy (bypasses CORS)
- `/` — Frontend that calls the API route and displays the data
- Auto-refreshes every 30 seconds
