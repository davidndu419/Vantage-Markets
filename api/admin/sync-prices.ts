/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireAdmin } from '../_lib/requireAdmin.js';
import { adminDb } from '../_lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await requireAdmin(req.headers.authorization);

    // 1. Fetch all assets
    const snapshot = await adminDb.collection('assets').get();
    const assets = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    if (assets.length === 0) {
      return res.status(200).json({ success: true, message: 'No assets found.', updatedCount: 0 });
    }

    const stockAssets = assets.filter((a) => a.type === 'stock');
    const cryptoAssets = assets.filter((a) => a.type === 'crypto');
    const pricesToUpdate: { assetId?: string; ticker: string; price: number }[] = [];

    // 2. Fetch Crypto Prices from CoinGecko
    if (cryptoAssets.length > 0) {
      const ids = cryptoAssets
        .map((a) => a.coingeckoId || a.id)
        .filter(Boolean)
        .join(',');

      if (ids) {
        const isPro = process.env.COINGECKO_IS_PRO === 'true';
        const baseUrl = isPro
          ? 'https://pro-api.coingecko.com/api/v3/simple/price'
          : 'https://api.coingecko.com/api/v3/simple/price';
        const url = new URL(baseUrl);
        url.searchParams.set('ids', ids);
        url.searchParams.set('vs_currencies', 'usd');

        const headers: Record<string, string> = {};
        if (process.env.COINGECKO_API_KEY) {
          headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
        }

        try {
          const apiResponse = await fetch(url, { headers });
          if (apiResponse.ok) {
            const data = (await apiResponse.json()) as any;
            cryptoAssets.forEach((asset) => {
              const coinData = data[asset.coingeckoId || asset.id];
              if (coinData && typeof coinData.usd === 'number') {
                pricesToUpdate.push({
                  assetId: asset.id,
                  ticker: asset.ticker,
                  price: coinData.usd,
                });
              }
            });
          }
        } catch (err: any) {
          console.error('Error fetching CoinGecko prices:', err?.message);
        }
      }
    }

    // 3. Fetch Stock/Forex Prices from Twelve Data
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (stockAssets.length > 0 && apiKey) {
      const tickers = stockAssets.map((a) => a.ticker).sort();
      const chunkSize = 8;
      const tickerChunks: string[][] = [];
      for (let i = 0; i < tickers.length; i += chunkSize) {
        tickerChunks.push(tickers.slice(i, i + chunkSize));
      }

      for (const chunk of tickerChunks) {
        const symbolsParam = chunk.join(',');
        const twelveDataUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolsParam)}&apikey=${apiKey}`;

        try {
          const apiResponse = await fetch(twelveDataUrl);
          if (apiResponse.ok) {
            const data = (await apiResponse.json()) as any;
            if (chunk.length === 1 && data.price) {
              const asset = stockAssets.find((a) => a.ticker === chunk[0]);
              pricesToUpdate.push({
                assetId: asset?.id,
                ticker: chunk[0],
                price: parseFloat(data.price),
              });
            } else if (data && typeof data === 'object') {
              chunk.forEach((sym) => {
                const item = data[sym] || data[sym.toUpperCase()];
                if (item && item.price) {
                  const asset = stockAssets.find((a) => a.ticker === sym);
                  pricesToUpdate.push({
                    assetId: asset?.id,
                    ticker: sym,
                    price: parseFloat(item.price),
                  });
                }
              });
            }
          }
        } catch (err: any) {
          console.error(`Error fetching Twelve Data chunk [${symbolsParam}]:`, err?.message);
        }

        // small delay between chunks
        if (tickerChunks.length > 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    // 4. Batch commit to Firestore
    if (pricesToUpdate.length > 0) {
      const batch = adminDb.batch();
      const now = new Date();

      pricesToUpdate.forEach(({ assetId, ticker, price }) => {
        const priceDocRef = adminDb.collection('assetPrices').doc(ticker);
        batch.set(priceDocRef, { ticker, price, updatedAt: now }, { merge: true });

        if (assetId) {
          const assetDocRef = adminDb.collection('assets').doc(assetId);
          batch.set(assetDocRef, { currentPrice: price }, { merge: true });
        }
      });

      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${pricesToUpdate.length} market prices.`,
      updatedCount: pricesToUpdate.length,
      updates: pricesToUpdate,
    });
  } catch (error: any) {
    const message = error?.message || 'Sync failed.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    console.error('Admin sync prices error:', message);
    return res.status(status).json({ error: message });
  }
}
