import { kv } from '@vercel/kv';

export async function GET() {
  const ZORBS_CONTRACT = '0xca21d4228cdcc68d4e23807e5e370c07577dd152';
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'ALCHEMY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch floor price
    const floorResponse = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getFloorPrice?contractAddress=${ZORBS_CONTRACT}`
    );

    if (!floorResponse.ok) {
      throw new Error('Failed to fetch floor price');
    }

    const floorData = await floorResponse.json();

    // Fetch collection metadata for supply
    const metaResponse = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getContractMetadata?contractAddress=${ZORBS_CONTRACT}`
    );

    if (!metaResponse.ok) {
      throw new Error('Failed to fetch contract metadata');
    }

    const metaData = await metaResponse.json();

    // Extract floor price (prefer OpenSea, fallback to LooksRare)
    const floorPrice = 
      floorData.openSea?.floorPrice || 
      floorData.looksRare?.floorPrice || 
      0;

    // Extract total supply
    const totalSupply = metaData.totalSupply 
      ? parseInt(metaData.totalSupply, 10) 
      : 0;

    const timestamp = Date.now();
    const marketCap = floorPrice * totalSupply;

    // Log to KV if available (won't work locally without KV setup)
    try {
      if (process.env.KV_REST_API_URL) {
        const dataPoint = { floorPrice, marketCap, totalSupply, timestamp };
        // Store with timestamp key for history
        await kv.zadd('zorbs:history', { score: timestamp, member: JSON.stringify(dataPoint) });
        // Keep only last 1 year (31536000000ms)
        const yearAgo = timestamp - 31536000000;
        await kv.zremrangebyscore('zorbs:history', 0, yearAgo);
      }
    } catch (kvError) {
      console.log('KV not available:', kvError.message);
    }

    return Response.json({
      floorPrice,
      totalSupply,
      marketCap,
      source: floorData.openSea?.floorPrice ? 'OpenSea' : 'LooksRare',
      timestamp: new Date(timestamp).toISOString(),
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
