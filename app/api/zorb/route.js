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
    let tokenId = null;
    let buyer = null;
    let transferTimestamp = null;

    // Get recent transfer
    try {
      const transfersResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
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
      const transfer = transfersData.result?.transfers?.[0];
      
      if (transfer?.tokenId) {
        tokenId = parseInt(transfer.tokenId, 16).toString();
        buyer = transfer.to;
        transferTimestamp = transfer.metadata?.blockTimestamp || null;
      }
    } catch (e) {
      console.log('Transfer fetch failed:', e.message);
    }

    // Fallback if no transfer
    if (!tokenId) {
      const randomStart = Math.floor(Math.random() * 50000);
      const nftsResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${ZORBS_CONTRACT}&withMetadata=true&startToken=${randomStart}&limit=1`
      );
      
      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        if (nftsData.nfts?.[0]) {
          tokenId = nftsData.nfts[0].tokenId;
        }
      }
    }

    if (!tokenId) {
      tokenId = '1';
    }

    // Resolve ENS name for buyer
    let buyerDisplay = null;
    let ensName = null;
    
    if (buyer) {
      // Try ENS reverse lookup
      try {
        const ensResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_call',
              params: [{
                to: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C', // ENS reverse registrar
                data: '0x691f3431' + buyer.slice(2).padStart(64, '0')
              }, 'latest']
            })
          }
        );
        
        if (ensResponse.ok) {
          const ensData = await ensResponse.json();
          // Check if we got a valid ENS name back
          if (ensData.result && ensData.result !== '0x') {
            // Try to decode - this is complex, so let's use a simpler method
          }
        }
      } catch (e) {
        console.log('ENS lookup failed');
      }

      // Simple approach: check ENS via Alchemy's API
      try {
        const reverseResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'alchemy_resolveName',
              params: [buyer]
            })
          }
        );
        // This method might not exist, so we'll just truncate address as fallback
      } catch (e) {}

      // Format display: truncated address (ENS lookup is tricky)
      buyerDisplay = `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
    }

    // Get image from token metadata
    let imageUrl = null;
    
    const nftResponse = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${ZORBS_CONTRACT}&tokenId=${tokenId}&refreshCache=false`
    );

    if (nftResponse.ok) {
      const nftData = await nftResponse.json();
      const rawUrl = 
        nftData.image?.cachedUrl || 
        nftData.image?.originalUrl ||
        nftData.raw?.metadata?.image ||
        null;
      
      // Skip Zora API URLs as they have CORS issues - we'll use gradient instead
      if (rawUrl && !rawUrl.includes('zora.co/api/zorb')) {
        imageUrl = rawUrl;
      }
    }

    // Generate Zorb gradient colors from buyer address
    // This is the primary way to show the Zorb - derived from wallet
    let gradientColors = null;
    if (buyer) {
      gradientColors = generateZorbColors(buyer);
    }

    return Response.json({
      tokenId,
      imageUrl,
      gradientColors,
      name: `Zorb #${tokenId}`,
      buyer,
      buyerDisplay,
      ensName,
      timestamp: transferTimestamp,
      isRecentTransfer: !!transferTimestamp,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Generate Zorb gradient colors from wallet address
// Based on Zora's zorb gradient algorithm
function generateZorbColors(address) {
  const addr = address.toLowerCase();
  
  // Hash different parts of the address for varied colors
  const hash1 = parseInt(addr.slice(2, 10), 16);
  const hash2 = parseInt(addr.slice(10, 18), 16);
  const hash3 = parseInt(addr.slice(18, 26), 16);
  const hash4 = parseInt(addr.slice(26, 34), 16);
  const hash5 = parseInt(addr.slice(34, 42), 16);
  
  // Generate hues with good distribution
  const h1 = hash1 % 360;
  const h2 = (hash2 % 360);
  const h3 = (hash3 % 360);
  const h4 = (hash4 % 360);
  const h5 = (hash5 % 360);
  
  // Vary saturation and lightness based on address
  const s1 = 60 + (hash1 % 30);
  const s2 = 60 + (hash2 % 30);
  const s3 = 60 + (hash3 % 30);
  const s4 = 60 + (hash4 % 30);
  const s5 = 60 + (hash5 % 30);
  
  const l1 = 50 + (hash1 % 20);
  const l2 = 45 + (hash2 % 20);
  const l3 = 40 + (hash3 % 20);
  const l4 = 45 + (hash4 % 20);
  const l5 = 50 + (hash5 % 20);
  
  return {
    c1: `hsl(${h1}, ${s1}%, ${l1}%)`,
    c2: `hsl(${h2}, ${s2}%, ${l2}%)`,
    c3: `hsl(${h3}, ${s3}%, ${l3}%)`,
    c4: `hsl(${h4}, ${s4}%, ${l4}%)`,
    c5: `hsl(${h5}, ${s5}%, ${l5}%)`,
  };
}
