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
    const monthAgo = now - 2592000000; // 30 days
    const yearAgo = now - 31536000000; // 365 days

    // Fetch all history from past year
    const history = await kv.zrange('zorbs:history', yearAgo, now, { byScore: true });

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
        return JSON.parse(item);
      }
      return item;
    }).sort((a, b) => a.timestamp - b.timestamp);

    const current = parsed[parsed.length - 1];

    // Find closest data points to each time period
    const findClosest = (targetTime, maxDiff = 1800000) => {
      let closest = null;
      let minDiff = Infinity;
      for (const point of parsed) {
        const diff = Math.abs(point.timestamp - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = point;
        }
      }
      // Return if within acceptable range (default 30 mins, but 12 hours for older data)
      return minDiff < maxDiff ? closest : null;
    };

    const hourData = findClosest(hourAgo, 1800000); // 30 min tolerance
    const dayData = findClosest(dayAgo, 7200000);   // 2 hour tolerance
    const weekData = findClosest(weekAgo, 43200000); // 12 hour tolerance
    const monthData = findClosest(monthAgo, 43200000);
    const yearData = findClosest(yearAgo, 86400000); // 24 hour tolerance

    const calcChange = (old, current) => {
      if (!old || old.floorPrice === 0) return null;
      return ((current.floorPrice - old.floorPrice) / old.floorPrice) * 100;
    };

    return Response.json({
      history: parsed, // Return full year of data
      changes: {
        hour: calcChange(hourData, current),
        day: calcChange(dayData, current),
        week: calcChange(weekData, current),
        month: calcChange(monthData, current),
        year: calcChange(yearData, current),
      },
      current,
      dataPoints: parsed.length,
    });
  } catch (error) {
    return Response.json(
      { error: error.message, history: [], changes: { hour: null, day: null, week: null, month: null, year: null } },
      { status: 500 }
    );
  }
}
