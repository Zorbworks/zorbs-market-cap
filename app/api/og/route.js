import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
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
            fontSize: 40,
            letterSpacing: '0.2em',
            marginBottom: 30,
          }}
        >
          ZORBS MARKET CAP
        </div>
        
        {/* Zorb circles decoration */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }} />
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          }} />
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          }} />
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          }} />
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          }} />
        </div>
        
        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 28,
          }}
        >
          Live Floor Price & Market Cap Tracker
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
