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

    // Resolve ENS name for buyer using Alchemy's lookup
    let buyerDisplay = null;
    let ensName = null;
    
    if (buyer) {
      // Try to get ENS name via reverse lookup
      try {
        // Convert address to reverse lookup format
        const reverseNode = buyer.toLowerCase().slice(2) + '.addr.reverse';
        
        // Use eth_call to get the ENS name
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
                to: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb', // ENS Reverse Registrar
                data: '0x691f3431' + buyer.toLowerCase().slice(2).padStart(64, '0')
              }, 'latest']
            })
          }
        );
        
        const ensData = await ensResponse.json();
        
        // If we got a result, try to decode it
        if (ensData.result && ensData.result.length > 130) {
          // The result contains the ENS name - extract it
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
        console.log('ENS lookup failed:', e.message);
      }
      
      // Format display: ENS name or truncated address
      if (ensName) {
        buyerDisplay = ensName;
      } else {
        buyerDisplay = `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
      }
    }

    return Response.json({
      tokenId,
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
