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
    let buyer = null;
    let transferTimestamp = null;

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
      console.log('Transfer fetch failed, falling back to random');
    }

    // If no transfer found, generate a random wallet for demo
    if (!buyer) {
      // Fallback: use a random token and its current owner
      const randomStart = Math.floor(Math.random() * 50000);
      const nftsResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${ZORBS_CONTRACT}&withMetadata=true&startToken=${randomStart}&limit=1`
      );
      
      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        if (nftsData.nfts?.[0]) {
          tokenId = nftsData.nfts[0].tokenId;
          // Get owner of this token
          const ownerResponse = await fetch(
            `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getOwnersForNFT?contractAddress=${ZORBS_CONTRACT}&tokenId=${tokenId}`
          );
          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            buyer = ownerData.owners?.[0] || null;
          }
        }
      }
    }

    if (!tokenId) {
      tokenId = '1';
    }

    // Resolve ENS name for buyer
    let buyerDisplay = buyer;
    let ensName = null;
    
    if (buyer) {
      try {
        const ensResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'ens_reverse',
              params: [buyer]
            })
          }
        );
        
        // Try alternative ENS lookup method
        const ensLookupResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${buyer}&contractAddresses[]=0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85&withMetadata=true&pageSize=1`
        );
        
        if (ensLookupResponse.ok) {
          const ensData = await ensLookupResponse.json();
          if (ensData.ownedNfts?.[0]?.name) {
            ensName = ensData.ownedNfts[0].name;
            if (!ensName.endsWith('.eth')) {
              ensName = ensName + '.eth';
            }
          }
        }
      } catch (e) {
        console.log('ENS lookup failed');
      }

      // Format display: ENS or truncated address
      if (ensName) {
        buyerDisplay = ensName;
      } else if (buyer) {
        buyerDisplay = `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
      }
    }

    // Get Zorb image based on BUYER's wallet (not token ID)
    // Zorb colors are derived from wallet address
    // Use Zora's API to get the correct Zorb for this wallet
    let imageUrl = null;
    
    if (buyer) {
      // Zora's Zorb API generates the correct gradient for any wallet
      imageUrl = `https://zora.co/api/zorb?address=${buyer}`;
    }
    
    // Fallback: if no buyer, get image from token metadata
    if (!imageUrl) {
      const nftResponse = await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${ZORBS_CONTRACT}&tokenId=${tokenId}&refreshCache=false`
      );

      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        imageUrl = 
          nftData.image?.cachedUrl || 
          nftData.image?.originalUrl ||
          nftData.raw?.metadata?.image ||
          null;
      }
    }

    return Response.json({
      tokenId,
      imageUrl,
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
