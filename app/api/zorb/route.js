import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const ZORBS_CONTRACT = '0xca21d4228cdcc68d4e23807e5e370c07577dd152';
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ALCHEMY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    let tokenId = null;
    let buyer = null;
    let transferTimestamp = null;
    let debugInfo = {};

    // Get recent transfer with cache busting
    try {
      const transfersResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'alchemy_getAssetTransfers',
            params: [{
              contractAddresses: [ZORBS_CONTRACT],
              category: ['erc721'],
              order: 'desc',
              maxCount: '0x1',
              withMetadata: true,
            }]
          })
        }
      );

      const transfersData = await transfersResponse.json();
      debugInfo.transfersResponse = transfersData;
      
      const transfer = transfersData.result?.transfers?.[0];
      
      if (transfer?.tokenId) {
        tokenId = parseInt(transfer.tokenId, 16).toString();
        buyer = transfer.to;
        transferTimestamp = transfer.metadata?.blockTimestamp || null;
        debugInfo.foundTransfer = true;
      } else {
        debugInfo.foundTransfer = false;
        debugInfo.transferError = 'No transfers in response';
      }
    } catch (e) {
      debugInfo.transferError = e.message;
      console.log('Transfer fetch failed:', e.message);
    }

    // Fallback if no transfer
    if (!tokenId) {
      const randomStart = Math.floor(Math.random() * 50000);
      const nftsResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${ZORBS_CONTRACT}&withMetadata=true&startToken=${randomStart}&limit=1&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      
      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        if (nftsData.nfts?.[0]) {
          tokenId = nftsData.nfts[0].tokenId;
          debugInfo.usedFallback = true;
        }
      }
    }

    if (!tokenId) {
      tokenId = '1';
      debugInfo.usedDefault = true;
    }

    // Resolve ENS name for buyer
    let buyerDisplay = null;
    let ensName = null;
    
    if (buyer) {
      try {
        const ensResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'eth_call',
              params: [{
                to: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
                data: '0x691f3431' + buyer.toLowerCase().slice(2).padStart(64, '0')
              }, 'latest']
            })
          }
        );
        
        const ensData = await ensResponse.json();
        
        if (ensData.result && ensData.result.length > 130) {
          const hex = ensData.result.slice(130);
          const nameBytes = hex.match(/.{2}/g) || [];
          let name = '';
          for (const byte of nameBytes) {
            const code = parseInt(byte, 16);
            if (code >= 32 && code < 127) {
              name += String.fromCharCode(code);
            }
          }
          if (name && name.includes('.eth')) {
            ensName = name.trim();
          }
        }
      } catch (e) {
        debugInfo.ensError = e.message;
      }
      
      buyerDisplay = ensName || `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
    }

    return NextResponse.json({
      tokenId,
      name: `Zorb #${tokenId}`,
      buyer,
      buyerDisplay,
      ensName,
      timestamp: transferTimestamp,
      isRecentTransfer: !!transferTimestamp,
      fetchedAt: new Date().toISOString(),
      debug: debugInfo,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
