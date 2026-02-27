import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache rates for 60 seconds to avoid hammering CoinGecko
let cachedRates = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached if fresh
    if (cachedRates && (now - cacheTime) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedRates,
        cached: true,
        cacheAge: Math.round((now - cacheTime) / 1000),
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        }
      });
    }

    // Fetch fresh rates from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,gbp,eur,btc',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }

    const data = await response.json();
    
    const rates = {
      usd: data.ethereum?.usd || 0,
      gbp: data.ethereum?.gbp || 0,
      eur: data.ethereum?.eur || 0,
      btc: data.ethereum?.btc || 0,
      fetchedAt: new Date().toISOString(),
    };

    // Update cache
    cachedRates = rates;
    cacheTime = now;

    return NextResponse.json({
      ...rates,
      cached: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  } catch (error) {
    // Return stale cache if available
    if (cachedRates) {
      return NextResponse.json({
        ...cachedRates,
        cached: true,
        stale: true,
        error: error.message,
      });
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
