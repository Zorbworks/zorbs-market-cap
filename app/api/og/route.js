import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request) {
  try {
    // Fetch current floor data
    const baseUrl = new URL(request.url).origin;
    let marketCap = '—';
    let floorPrice = '—';
    
    try {
      const response = await fetch(`${baseUrl}/api/floor?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        marketCap = data.marketCap ? data.marketCap.toFixed(2) : '—';
        floorPrice = data.floorPrice ? data.floorPrice.toFixed(4) : '—';
      }
    } catch (e) {
      console.error('Failed to fetch floor data for OG:', e);
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            fontFamily: 'monospace',
          }}
        >
          {/* Title */}
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 32,
              letterSpacing: '0.2em',
              marginBottom: 20,
            }}
          >
            ZORBS MARKET CAP
          </div>
          
          {/* Main value */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              color: '#ffffff',
            }}
          >
            <span
              style={{
                fontSize: 140,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {marketCap}
            </span>
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                marginLeft: 16,
                opacity: 0.6,
              }}
            >
              ETH
            </span>
          </div>
          
          {/* Floor price */}
          <div
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 28,
              marginTop: 30,
            }}
          >
            Floor: {floorPrice} ETH
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG image generation failed:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
