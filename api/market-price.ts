/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireAdmin } from './_lib/requireAdmin.js';
import {
  fetchCryptoSpotPrice,
  fetchStockSpotPrice,
} from './_lib/marketPriceProviders.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await requireAdmin(req.headers.authorization);

    const type = req.body?.type;
    const ticker = String(req.body?.ticker || '').trim().toUpperCase();
    const coingeckoId = String(req.body?.coingeckoId || '').trim().toLowerCase();

    if (!ticker || (type !== 'stock' && type !== 'crypto')) {
      return res.status(400).json({ error: 'A valid type and ticker are required.' });
    }
    if (type === 'crypto' && !coingeckoId) {
      return res.status(400).json({ error: 'CoinGecko ID is required for crypto assets.' });
    }

    const price = type === 'stock'
      ? await fetchStockSpotPrice(ticker)
      : await fetchCryptoSpotPrice(coingeckoId);

    return res.status(200).json({
      ticker,
      price,
      provider: type === 'stock' ? 'Twelve Data' : 'CoinGecko',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    const message = error?.message || 'Live price lookup failed.';
    const status = message === 'Unauthorized'
      ? 401
      : message === 'Forbidden'
        ? 403
        : 502;
    console.error('Market price lookup failed:', message);
    return res.status(status).json({ error: message });
  }
}
