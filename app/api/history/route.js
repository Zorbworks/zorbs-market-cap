import { kv } from '@vercel/kv';

export async function GET() {
  try {
    if (!process.env.KV_REST_API_URL) {
      return Response.json({
        history: [],
        changes: { hour: null, day: null, week: null, month: null, quarter: null },
        message: 'KV not configured - historical data unavailable'
      });
    }

    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;
    const monthAgo = now - 2592000000;
    const quarterAgo = now - 6652800000; // 77 days in ms

    // Fetch all history from past year
    const history = await kv.zrange('zorbs:history', 0, -1, { withScores: false });

    if (!history || history.length === 0) {
      return Response.json({
        history: [],
        changes: { hour: null, day: null, week: null, month: null, quarter: null },
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
      return Response.json({
        history: [],
        changes: { hour: null, day: null, week: null, month: null, quarter: null },
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
      
      // Also calculate the 90th percentile for threshold
      const p90Index = Math.floor(prices.length * 0.90);
      const p90 = prices[p90Index];
      
      // Use 3x median or 1.5x 90th percentile - whichever is lower (more aggressive)
      const threshold = Math.min(median * 3, p90 * 1.5);
      
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
    const hourData = findClosest(hourAgo, 3600000 * 2);      // 2 hour tolerance
    const dayData = findClosest(dayAgo, 3600000 * 12);       // 12 hour tolerance  
    const weekData = findClosest(weekAgo, 3600000 * 24);     // 24 hour tolerance
    const monthData = findClosest(monthAgo, 3600000 * 48);   // 48 hour tolerance
    const quarterData = findClosest(quarterAgo, 3600000 * 72); // 72 hour tolerance

    const calcChange = (old, current) => {
      if (!old || !current || old.floorPrice === 0) return null;
      return ((current.floorPrice - old.floorPrice) / old.floorPrice) * 100;
    };

    return Response.json({
      history: filtered,
      changes: {
        hour: calcChange(hourData, current),
        day: calcChange(dayData, current),
        week: calcChange(weekData, current),
        month: calcChange(monthData, current),
        quarter: calcChange(quarterData, current),
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
    });
  } catch (error) {
    console.error('History error:', error);
    return Response.json(
      { error: error.message, history: [], changes: { hour: null, day: null, week: null, month: null, quarter: null } },
      { status: 500 }
    );
  }
}
