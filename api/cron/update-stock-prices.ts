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

    // 3. Cursor-based fetch: process N tickers per run to respect Twelve Data rate limits
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured.' });
    }

    const tickers = stockAssets.map((asset) => asset.ticker).sort();

    const STATE_DOC = adminDb.collection('cronState').doc('stockUpdater');
    const stateSnap = await STATE_DOC.get();
    const state = stateSnap.exists ? (stateSnap.data() as any) : { lastIndex: 0 };
    const lastIndex = typeof state.lastIndex === 'number' ? state.lastIndex : 0;

    const N = 8; // number of tickers to process per run (match Twelve Data Basic 8/min)
    const resultsToProcess: string[] = [];
    const start = lastIndex % tickers.length;
    if (tickers.length === 0) {
      return res.status(200).json({ success: true, message: 'No tickers to process.' });
    }

    if (start + N <= tickers.length) {
      resultsToProcess.push(...tickers.slice(start, start + N));
    } else {
      resultsToProcess.push(...tickers.slice(start));
      resultsToProcess.push(...tickers.slice(0, (start + N) % tickers.length));
    }

    const pricesToUpdate: { ticker: string; price: number }[] = [];

    for (const ticker of resultsToProcess) {
      const twelveDataUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
      let fetched = false;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= 3 && !fetched; attempt += 1) {
        try {
          const apiResponse = await fetch(twelveDataUrl);
          if (!apiResponse.ok) {
            lastError = `Twelve Data API returned status ${apiResponse.status}`;
            if (apiResponse.status === 429) {
              // wait and retry
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            break;
          }

          const data = await apiResponse.json();
          if (data.status === 'error') {
            lastError = data.message || 'Twelve Data returned an error';
            if (typeof data.message === 'string' && (data.message.toLowerCase().includes('rate limit') || data.message.includes('429'))) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            break;
          }

          if (data.price) {
            pricesToUpdate.push({ ticker, price: parseFloat(data.price) });
            fetched = true;
          }
        } catch (err: any) {
          lastError = err?.message || 'Unknown fetch error';
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!fetched) {
        console.warn(`Skipping ${ticker} after retries: ${lastError}`);
      }

      // small safety delay between requests
      await new Promise((r) => setTimeout(r, 800));
    }

    // advance lastIndex
    const newLastIndex = (lastIndex + N) % tickers.length;
    await STATE_DOC.set({ lastIndex: newLastIndex, updatedAt: new Date() }, { merge: true });

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
