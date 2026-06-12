/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from '../_lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  try {
    // 1. CRON_SECRET validation
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // 3. Fetch prices from Twelve Data
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured.' });
    }

    const tickers = stockAssets.map((asset) => asset.ticker);
    const symbolsQuery = tickers.join(',');
    const twelveDataUrl = `https://api.twelvedata.com/price?symbol=${symbolsQuery}&apikey=${apiKey}`;

    const apiResponse = await fetch(twelveDataUrl);
    if (!apiResponse.ok) {
      throw new Error(`Twelve Data API returned status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    if (data.status === 'error') {
      return res.status(502).json({ error: 'Twelve Data API returned error: ' + data.message });
    }

    // 4. Parse response
    const pricesToUpdate: { ticker: string; price: number }[] = [];
    if (tickers.length === 1) {
      const ticker = tickers[0];
      if (data.price) {
        pricesToUpdate.push({ ticker, price: parseFloat(data.price) });
      }
    } else {
      tickers.forEach((ticker) => {
        const tickerData = data[ticker];
        if (tickerData && tickerData.price) {
          pricesToUpdate.push({ ticker, price: parseFloat(tickerData.price) });
        }
      });
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
