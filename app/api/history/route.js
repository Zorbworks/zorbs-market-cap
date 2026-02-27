import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!process.env.KV_REST_API_URL) {
      return NextResponse.json({
        history: [],
        changes: { hours7: null, days7: null, weeks7: null, days77: null },
        message: 'KV not configured - historical data unavailable'
      });
    }

    const now = Date.now();
    const hours7Ago = now - 25200000;       // 7 hours
    const days7Ago = now - 604800000;       // 7 days
    const weeks7Ago = now - 4233600000;     // 7 weeks (49 days)
    const days77Ago = now - 6652800000;     // 77 days

    // Fetch all history from past year
    const history = await kv.zrange('zorbs:history', 0, -1, { withScores: false });

    if (!history || history.length === 0) {
      return NextResponse.json({
        history: [],
        changes: { hours7: null, days7: null, weeks7: null, days77: null },
        message: 'No historical data yet - collecting...'
      });
    }

    // Parse history
    const parsed = history.map(item => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch (e) {
          return null;
        }
      }
      return item;
    }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);

    if (parsed.length === 0) {
      return NextResponse.json({
        history: [],
        changes: { hours7: null, days7: null, weeks7: null, days77: null },
        message: 'No valid historical data'
      });
    }

    // Filter outliers using median-based approach
    const filterOutliers = (data) => {
      if (data.length < 5) return data;
      
      // Get all floor prices and calculate median
      const prices = data.map(d => d.floorPrice).filter(p => p > 0).sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
      
      // Calculate 75th percentile
      const p75Index = Math.floor(prices.length * 0.75);
      const p75 = prices[p75Index];
      
      // Very aggressive: 2x median or 1.2x 75th percentile - whichever is lower
      const threshold = Math.min(median * 2, p75 * 1.2);
      
      // Filter out points above threshold
      return data.filter(point => point.floorPrice <= threshold);
    };

    const filtered = filterOutliers(parsed);

    const current = parsed[parsed.length - 1];

    // Find closest data point to target time with variable tolerance
    // Use filtered data for change calculations too
    const findClosest = (targetTime, maxToleranceMs) => {
      let closest = null;
      let minDiff = Infinity;
      
      for (const point of filtered) {
        const diff = Math.abs(point.timestamp - targetTime);
        if (diff < minDiff && diff <= maxToleranceMs) {
          minDiff = diff;
          closest = point;
        }
      }
      return closest;
    };

    // Use appropriate tolerances based on backfill granularity (6 hours between points)
    const hours7Data = findClosest(hours7Ago, 3600000 * 4);    // 4 hour tolerance
    const days7Data = findClosest(days7Ago, 3600000 * 24);     // 24 hour tolerance  
    const weeks7Data = findClosest(weeks7Ago, 3600000 * 48);   // 48 hour tolerance
    const days77Data = findClosest(days77Ago, 3600000 * 72);   // 72 hour tolerance

    const calcChange = (old, current) => {
      if (!old || !current || old.floorPrice === 0) return null;
      return ((current.floorPrice - old.floorPrice) / old.floorPrice) * 100;
    };

    return NextResponse.json({
      history: filtered,
      changes: {
        hours7: calcChange(hours7Data, current),
        days7: calcChange(days7Data, current),
        weeks7: calcChange(weeks7Data, current),
        days77: calcChange(days77Data, current),
      },
      current,
      dataPoints: filtered.length,
      debug: {
        oldest: filtered[0]?.timestamp ? new Date(filtered[0].timestamp).toISOString() : null,
        newest: current?.timestamp ? new Date(current.timestamp).toISOString() : null,
        totalPoints: parsed.length,
        filteredPoints: filtered.length,
        removedOutliers: parsed.length - filtered.length,
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: error.message, history: [], changes: { hours7: null, days7: null, weeks7: null, days77: null } },
      { status: 500 }
    );
  }
}
