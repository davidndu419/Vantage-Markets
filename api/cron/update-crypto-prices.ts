/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from '../_lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  try {
    // 1. CRON_SECRET validation
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Fetch all crypto assets
    const snapshot = await adminDb.collection('assets').where('type', '==', 'crypto').get();
    const cryptoAssets = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    if (cryptoAssets.length === 0) {
      return res.status(200).json({ success: true, message: 'No crypto assets found to update.' });
    }

    // 3. Fetch prices from CoinGecko
    const ids = cryptoAssets
      .map((asset) => asset.coingeckoId || asset.id)
      .join(',');
    let url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const headers: Record<string, string> = {};

    if (process.env.COINGECKO_API_KEY) {
      const isPro = process.env.COINGECKO_IS_PRO === 'true';
      if (isPro) {
        url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
        headers['x-cg-pro-api-key'] = process.env.COINGECKO_API_KEY;
      } else {
        headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
      }
    }

    const apiResponse = await fetch(url, { headers });
    if (!apiResponse.ok) {
      throw new Error(`CoinGecko API returned status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // 4. Parse response
    const pricesToUpdate: { ticker: string; price: number }[] = [];
    cryptoAssets.forEach((asset) => {
      const coinData = data[asset.coingeckoId || asset.id];
      if (coinData && typeof coinData.usd === 'number') {
        pricesToUpdate.push({ ticker: asset.ticker, price: coinData.usd });
      }
    });

    // 5. Update Firestore assetPrices
    if (pricesToUpdate.length > 0) {
      const batch = adminDb.batch();
      pricesToUpdate.forEach(({ ticker, price }) => {
        const priceDocRef = adminDb.collection('assetPrices').doc(ticker);
        const asset = cryptoAssets.find((candidate) => candidate.ticker === ticker);
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
      message: `Successfully updated crypto prices.`,
      updatedCount: pricesToUpdate.length,
      updates: pricesToUpdate,
    });
  } catch (error: any) {
    console.error('Error in update-crypto-prices cron:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
