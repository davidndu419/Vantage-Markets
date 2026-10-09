/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from '../_lib/firebaseAdmin.js';

function getCronSecret(req: any) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const url = new URL(req.url || '', 'http://localhost');
  const secretQuery = url.searchParams.get('secret') || '';
  if (secretQuery) {
    return secretQuery;
  }

  const cronSecretQuery = url.searchParams.get('cron-secret') || '';
  if (cronSecretQuery) {
    return cronSecretQuery;
  }

  const headerSecret = req.headers['x-cron-secret'] || req.headers['x-secret'] || '';
  if (Array.isArray(headerSecret)) {
    return headerSecret[0] || '';
  }
  return String(headerSecret || '');
}

export default async function handler(req: any, res: any) {
  try {
    // 1. CRON_SECRET validation
    const secret = getCronSecret(req);
    const isVercelCron = req.headers['x-vercel-cron'] === 'true';
    if (!isVercelCron && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Fetch all stock assets
    const snapshot = await adminDb.collection('assets').where('type', '==', 'stock').get();
    const stockAssets = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    if (stockAssets.length === 0) {
      return res.status(200).json({ success: true, message: 'No stock assets found to update.' });
    }

    // 3. Process all tickers in batches of 8 (Twelve Data free rate limit)
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured.' });
    }

    const tickers = stockAssets.map((asset) => asset.ticker).sort();
    if (tickers.length === 0) {
      return res.status(200).json({ success: true, message: 'No tickers to process.' });
    }

    const chunkSize = 8;
    const tickerChunks: string[][] = [];
    for (let i = 0; i < tickers.length; i += chunkSize) {
      tickerChunks.push(tickers.slice(i, i + chunkSize));
    }

    const pricesToUpdate: { ticker: string; price: number }[] = [];

    for (const chunk of tickerChunks) {
      const symbolsParam = chunk.join(',');
      const twelveDataUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolsParam)}&apikey=${apiKey}`;
      let fetched = false;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= 3 && !fetched; attempt += 1) {
        try {
          const apiResponse = await fetch(twelveDataUrl);
          if (!apiResponse.ok) {
            lastError = `Twelve Data API returned status ${apiResponse.status}`;
            if (apiResponse.status === 429) {
              await new Promise((r) => setTimeout(r, 1200));
              continue;
            }
            break;
          }

          const data = await apiResponse.json();
          if (data.status === 'error') {
            lastError = data.message || 'Twelve Data returned an error';
            if (typeof data.message === 'string' && (data.message.toLowerCase().includes('rate limit') || data.message.includes('429'))) {
              await new Promise((r) => setTimeout(r, 1200));
              continue;
            }
            break;
          }

          if (chunk.length === 1 && data.price) {
            pricesToUpdate.push({ ticker: chunk[0], price: parseFloat(data.price) });
            fetched = true;
          } else {
            chunk.forEach((sym) => {
              const item = data[sym] || data[sym.toUpperCase()];
              if (item && item.price) {
                pricesToUpdate.push({ ticker: sym, price: parseFloat(item.price) });
              }
            });
            fetched = true;
          }
        } catch (err: any) {
          lastError = err?.message || 'Unknown fetch error';
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!fetched) {
        console.warn(`Skipping chunk [${symbolsParam}] after retries: ${lastError}`);
      }

      // safety delay between batch requests
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 5. Update Firestore assetPrices
    if (pricesToUpdate.length > 0) {
      const batch = adminDb.batch();
      pricesToUpdate.forEach(({ ticker, price }) => {
        const priceDocRef = adminDb.collection('assetPrices').doc(ticker);
        const asset = stockAssets.find((candidate) => candidate.ticker === ticker);
        batch.set(
          priceDocRef,
          {
            ticker,
            price,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        if (asset) {
          batch.set(
            adminDb.collection('assets').doc(asset.id),
            { currentPrice: price },
            { merge: true }
          );
        }
      });
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: `Successfully updated stock prices.`,
      updatedCount: pricesToUpdate.length,
      updates: pricesToUpdate,
    });
  } catch (error: any) {
    console.error('Error in update-stock-prices cron:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
