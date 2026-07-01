/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from '../_lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  try {
    // 1. CRON_SECRET validation
    const authHeader = req.headers.authorization;
    const secretQuery = new URL(req.url || '', 'http://localhost').searchParams.get('secret') || '';
    const isVercelCron = req.headers['x-vercel-cron'] === 'true';
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}` && secretQuery !== process.env.CRON_SECRET) {
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

    // 3. Fetch prices from Twelve Data (chunked with retries to avoid rate limits)
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured.' });
    }

    const tickers = stockAssets.map((asset) => asset.ticker);

    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const chunks = chunkArray(tickers, 5); // request up to 5 symbols per call
    const pricesToUpdate: { ticker: string; price: number }[] = [];

    for (const chunk of chunks) {
      const symbolsQuery = chunk.join(',');
      const twelveDataUrl = `https://api.twelvedata.com/price?symbol=${symbolsQuery}&apikey=${apiKey}`;

      let attempt = 0;
      let chunkData: any = null;
      while (attempt < 3) {
        attempt += 1;
        const apiResponse = await fetch(twelveDataUrl);
        if (apiResponse.ok) {
          chunkData = await apiResponse.json();
          break;
        }
        if (apiResponse.status === 429) {
          // rate limited — small delay and retry
          await new Promise((r) => setTimeout(r, 1100));
          continue;
        }
        // other errors: break and surface
        throw new Error(`Twelve Data API returned status ${apiResponse.status}`);
      }

      if (!chunkData) {
        console.warn('Twelve Data chunk failed after retries:', chunk);
        continue;
      }

      if (chunk.length === 1) {
        const ticker = chunk[0];
        if (chunkData.price) {
          pricesToUpdate.push({ ticker, price: parseFloat(chunkData.price) });
        }
      } else {
        chunk.forEach((ticker) => {
          const tickerData = chunkData[ticker];
          if (tickerData && tickerData.price) {
            pricesToUpdate.push({ ticker, price: parseFloat(tickerData.price) });
          }
        });
      }
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
