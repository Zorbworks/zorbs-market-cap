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

    // Format buyer display as truncated address
    let buyerDisplay = null;
    if (buyer) {
      buyerDisplay = `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
    }

    // Get image from Alchemy's cached NFT metadata
    let imageUrl = null;
    
    const nftResponse = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${ZORBS_CONTRACT}&tokenId=${tokenId}&refreshCache=false`
    );

    if (nftResponse.ok) {
      const nftData = await nftResponse.json();
      // Prefer Alchemy's cached URL
      imageUrl = 
        nftData.image?.cachedUrl || 
        nftData.image?.pngUrl ||
        nftData.image?.originalUrl ||
        null;
    }

    // Generate Zorb gradient colors from buyer address for CSS fallback
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
function generateZorbColors(address) {
  const addr = address.toLowerCase();
  
  // Use parts of the address to generate hues
  const h1 = parseInt(addr.slice(2, 10), 16) % 360;
  const h2 = (h1 + 40) % 360;
  const h3 = (h1 + 80) % 360;
  const h4 = (h1 + 120) % 360;
  const h5 = (h1 + 160) % 360;
  
  return {
    c1: `hsl(${h1}, 70%, 60%)`,
    c2: `hsl(${h2}, 70%, 55%)`,
    c3: `hsl(${h3}, 70%, 50%)`,
    c4: `hsl(${h4}, 70%, 55%)`,
    c5: `hsl(${h5}, 70%, 60%)`,
  };
}
