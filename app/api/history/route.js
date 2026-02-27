import { kv } from '@vercel/kv';

export async function GET() {
  try {
    if (!process.env.KV_REST_API_URL) {
      return Response.json({
        history: [],
        changes: { hour: null, day: null, week: null, month: null, year: null },
        message: 'KV not configured - historical data unavailable'
      });
    }

    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;
    const monthAgo = now - 2592000000;
    const yearAgo = now - 31536000000;

    // Fetch all history from past year
    const history = await kv.zrange('zorbs:history', 0, -1, { withScores: false });

    if (!history || history.length === 0) {
      return Response.json({
        history: [],
        changes: { hour: null, day: null, week: null, month: null, year: null },
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
        changes: { hour: null, day: null, week: null, month: null, year: null },
        message: 'No valid historical data'
      });
    }

    const current = parsed[parsed.length - 1];

    // Find closest data point to target time with variable tolerance
    const findClosest = (targetTime, maxToleranceMs) => {
      let closest = null;
      let minDiff = Infinity;
      
      for (const point of parsed) {
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
    const yearData = findClosest(yearAgo, 3600000 * 72);     // 72 hour tolerance

    const calcChange = (old, current) => {
      if (!old || !current || old.floorPrice === 0) return null;
      return ((current.floorPrice - old.floorPrice) / old.floorPrice) * 100;
    };

    return Response.json({
      history: parsed,
      changes: {
        hour: calcChange(hourData, current),
        day: calcChange(dayData, current),
        week: calcChange(weekData, current),
        month: calcChange(monthData, current),
        year: calcChange(yearData, current),
      },
      current,
      dataPoints: parsed.length,
      debug: {
        oldest: parsed[0]?.timestamp ? new Date(parsed[0].timestamp).toISOString() : null,
        newest: current?.timestamp ? new Date(current.timestamp).toISOString() : null,
        totalPoints: parsed.length,
      }
    });
  } catch (error) {
    console.error('History error:', error);
    return Response.json(
      { error: error.message, history: [], changes: { hour: null, day: null, week: null, month: null, year: null } },
      { status: 500 }
    );
  }
}
