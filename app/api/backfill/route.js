import { kv } from '@vercel/kv';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const duneApiKey = searchParams.get('dune_key') || process.env.DUNE_API_KEY;
  const queryId = searchParams.get('query_id');
  
  if (!duneApiKey) {
    return Response.json({ 
      error: 'Dune API key required. Pass as ?dune_key=YOUR_KEY',
      instructions: [
        '1. Go to dune.com and create this query:',
        '',
        'SELECT',
        '  date_trunc(\'day\', block_time) as day,',
        '  MIN(amount_raw / 1e18) as floor_price',
        'FROM nft.trades',
        'WHERE nft_contract_address = 0xca21d4228cdcc68d4e23807e5e370c07577dd152',
        '  AND amount_raw > 0',
        '  AND block_time >= NOW() - INTERVAL \'365\' DAY',
        'GROUP BY 1',
        'ORDER BY 1 ASC',
        '',
        '2. Save the query and copy the query ID from the URL',
        '3. Call this endpoint with ?dune_key=YOUR_KEY&query_id=QUERY_ID'
      ]
    }, { status: 400 });
  }

  if (!queryId) {
    return Response.json({ 
      error: 'Query ID required. Pass as ?query_id=YOUR_QUERY_ID',
      instructions: [
        '1. Go to dune.com and create this query:',
        '',
        'SELECT',
        '  date_trunc(\'day\', block_time) as day,',
        '  MIN(amount_raw / 1e18) as floor_price',
        'FROM nft.trades',
        'WHERE nft_contract_address = 0xca21d4228cdcc68d4e23807e5e370c07577dd152',
        '  AND amount_raw > 0',
        '  AND block_time >= NOW() - INTERVAL \'365\' DAY',
        'GROUP BY 1',
        'ORDER BY 1 ASC',
        '',
        '2. Save the query and copy the query ID from the URL (e.g., dune.com/queries/123456)',
        '3. Call: /api/backfill?dune_key=YOUR_KEY&query_id=123456'
      ]
    }, { status: 400 });
  }

  if (!process.env.KV_REST_API_URL) {
    return Response.json({ 
      error: 'KV not configured - deploy to Vercel first' 
    }, { status: 500 });
  }

  try {
    // Step 1: Execute the saved query
    console.log('Executing Dune query:', queryId);
    const executeResponse = await fetch(
      `https://api.dune.com/api/v1/query/${queryId}/execute`,
      {
        method: 'POST',
        headers: {
          'X-Dune-API-Key': duneApiKey,
        },
      }
    );

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      throw new Error(`Dune execute failed: ${errorText}`);
    }

    const executeData = await executeResponse.json();
    const executionId = executeData.execution_id;

    if (!executionId) {
      throw new Error('No execution ID returned from Dune');
    }

    console.log('Execution ID:', executionId);

    // Step 2: Poll for results
    let results = null;
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(
        `https://api.dune.com/api/v1/execution/${executionId}/results`,
        {
          headers: {
            'X-Dune-API-Key': duneApiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      
      if (statusData.state === 'QUERY_STATE_COMPLETED') {
        results = statusData.result?.rows || [];
        break;
      } else if (statusData.state === 'QUERY_STATE_FAILED') {
        throw new Error('Dune query failed: ' + (statusData.error || 'Unknown error'));
      }

      console.log('Query state:', statusData.state, '- waiting...');
      attempts++;
    }

    if (!results) {
      throw new Error('Dune query timed out after 5 minutes');
    }

    console.log(`Got ${results.length} days of historical data`);

    if (results.length === 0) {
      return Response.json({
        success: false,
        message: 'No data returned from Dune. Check your query.',
      });
    }

    // Step 3: Get total supply
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    let totalSupply = 56741;
    
    if (alchemyKey) {
      try {
        const metaResponse = await fetch(
          `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getContractMetadata?contractAddress=0xca21d4228cdcc68d4e23807e5e370c07577dd152`
        );
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          totalSupply = parseInt(metaData.totalSupply, 10) || totalSupply;
        }
      } catch (e) {
        console.log('Could not fetch supply, using fallback');
      }
    }

    // Step 4: Store in KV
    let stored = 0;
    for (const row of results) {
      const day = new Date(row.day);
      const floorPrice = parseFloat(row.floor_price);
      
      if (isNaN(floorPrice) || floorPrice <= 0) continue;

      // Create 4 data points per day for smoother charts
      const timestamps = [
        day.getTime(),
        day.getTime() + 6 * 3600000,
        day.getTime() + 12 * 3600000,
        day.getTime() + 18 * 3600000,
      ];

      for (const timestamp of timestamps) {
        const dataPoint = {
          floorPrice,
          marketCap: floorPrice * totalSupply,
          totalSupply,
          timestamp,
        };

        await kv.zadd('zorbs:history', { 
          score: timestamp, 
          member: JSON.stringify(dataPoint) 
        });
        stored++;
      }
    }

    return Response.json({
      success: true,
      message: `Backfilled ${results.length} days (${stored} data points)`,
      dateRange: {
        from: results[0]?.day,
        to: results[results.length - 1]?.day,
      },
      sample: results.slice(0, 3),
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
