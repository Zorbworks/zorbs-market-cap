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
    // Try to get recent transfers first
    let tokenId = null;
    let transferInfo = null;

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
        transferInfo = {
          from: transfer.from,
          to: transfer.to,
          timestamp: transfer.metadata?.blockTimestamp || null,
        };
      }
    } catch (e) {
      console.log('Transfer fetch failed, falling back to random');
    }

    // Fallback: get a random Zorb if no recent transfer found
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
      // Final fallback: just use a known token ID
      tokenId = '1';
    }

    // Fetch the NFT metadata
    const nftResponse = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${ZORBS_CONTRACT}&tokenId=${tokenId}&refreshCache=false`
    );

    if (!nftResponse.ok) {
      throw new Error('Failed to fetch NFT metadata');
    }

    const nftData = await nftResponse.json();

    const imageUrl = 
      nftData.image?.cachedUrl || 
      nftData.image?.originalUrl ||
      nftData.raw?.metadata?.image ||
      null;

    return Response.json({
      tokenId,
      imageUrl,
      name: nftData.name || `Zorb #${tokenId}`,
      ...(transferInfo && { 
        from: transferInfo.from,
        to: transferInfo.to,
        timestamp: transferInfo.timestamp,
        isRecentTransfer: true,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
