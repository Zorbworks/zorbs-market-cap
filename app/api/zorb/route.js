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
    // Fetch recent transfers for Zorbs contract
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
            fromBlock: 'latest',
            toBlock: 'latest',
            contractAddresses: [ZORBS_CONTRACT],
            category: ['erc721'],
            order: 'desc',
            maxCount: '0x1',
            withMetadata: true,
          }]
        })
      }
    );

    if (!transfersResponse.ok) {
      throw new Error('Failed to fetch transfers');
    }

    const transfersData = await transfersResponse.json();
    
    // If no recent transfers in latest block, get from last 1000 blocks
    let transfer = transfersData.result?.transfers?.[0];
    
    if (!transfer) {
      const recentResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [{
              fromBlock: 'latest',
              contractAddresses: [ZORBS_CONTRACT],
              category: ['erc721'],
              order: 'desc',
              maxCount: '0x1',
              withMetadata: true,
            }]
          })
        }
      );
      
      const recentData = await recentResponse.json();
      transfer = recentData.result?.transfers?.[0];
    }

    if (!transfer) {
      throw new Error('No recent transfers found');
    }

    // Extract token ID from the transfer
    const tokenId = transfer.tokenId ? parseInt(transfer.tokenId, 16).toString() : null;
    
    if (!tokenId) {
      throw new Error('Could not get token ID from transfer');
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
      from: transfer.from,
      to: transfer.to,
      timestamp: transfer.metadata?.blockTimestamp || null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
