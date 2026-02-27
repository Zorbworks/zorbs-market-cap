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

    // Fetch the actual Zorb SVG from Zora's API (server-side to avoid CORS)
    let zorbSvgDataUri = null;
    if (buyer) {
      try {
        const zorbResponse = await fetch(`https://zora.co/api/zorb?address=${buyer}`);
        if (zorbResponse.ok) {
          const svgText = await zorbResponse.text();
          // Convert to data URI
          const base64 = Buffer.from(svgText).toString('base64');
          zorbSvgDataUri = `data:image/svg+xml;base64,${base64}`;
        }
      } catch (e) {
        console.log('Zorb fetch failed:', e.message);
      }
    }

    return Response.json({
      tokenId,
      imageUrl: zorbSvgDataUri,
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
