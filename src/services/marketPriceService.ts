import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { Asset } from '../types';

export type CreateAssetPayload = Omit<Asset, 'createdAt' | 'currentPrice'>;

interface LivePriceResponse {
  ticker: string;
  price: number;
  provider: 'Twelve Data' | 'CoinGecko';
  fetchedAt: string;
}

const fetchLivePrice = async (
  type: Asset['type'],
  ticker: string,
  coingeckoId?: string
): Promise<LivePriceResponse> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication is required.');

  const token = await user.getIdToken();
  const response = await fetch('/api/market-price', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type, ticker, coingeckoId }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Live price endpoint rejected the request:', data.error);
    throw new Error('Live price could not be fetched. Please check ticker/coingeckoId.');
  }

  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Live price could not be fetched. Please check ticker/coingeckoId.');
  }

  return { ...data, price } as LivePriceResponse;
};

export const marketPriceService = {
  async fetchStockPrice(ticker: string): Promise<LivePriceResponse> {
    return fetchLivePrice('stock', ticker);
  },

  async fetchCryptoPrice(coingeckoId: string, ticker = ''): Promise<LivePriceResponse> {
    return fetchLivePrice('crypto', ticker, coingeckoId);
  },

  async createAssetWithLivePrice(
    assetPayload: CreateAssetPayload
  ): Promise<LivePriceResponse> {
    const assetRef = doc(db, 'assets', assetPayload.id);
    const [existingAsset, tickerMatches] = await Promise.all([
      getDoc(assetRef),
      getDocs(query(
        collection(db, 'assets'),
        where('ticker', '==', assetPayload.ticker)
      )),
    ]);

    if (existingAsset.exists()) {
      throw new Error('An asset with this ID already exists.');
    }
    if (!tickerMatches.empty) {
      throw new Error('An asset with this ticker already exists.');
    }

    const quote = assetPayload.type === 'stock'
      ? await this.fetchStockPrice(assetPayload.ticker)
      : await this.fetchCryptoPrice(
          assetPayload.coingeckoId || '',
          assetPayload.ticker
        );

    const batch = writeBatch(db);
    batch.set(assetRef, {
      ...assetPayload,
      currentPrice: quote.price,
      createdAt: new Date(),
    });
    batch.set(doc(db, 'assetPrices', assetPayload.ticker), {
      ticker: assetPayload.ticker,
      price: quote.price,
      updatedAt: new Date(),
    });
    await batch.commit();

    return quote;
  },

  async syncAllPrices(): Promise<{ success: boolean; updatedCount: number; message: string }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Administrator authentication is required.');

    const token = await user.getIdToken();
    try {
      const response = await fetch('/api/admin/sync-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          updatedCount: data.updatedCount || 0,
          message: data.message || `Updated ${data.updatedCount || 0} live market prices.`,
        };
      }
    } catch (err) {
      console.warn('Backend sync-prices endpoint unreachable, running fallback sync:', err);
    }

    // Fallback sync for dev mode
    const assetsSnap = await getDocs(collection(db, 'assets'));
    const assets = assetsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Asset[];
    const cryptoAssets = assets.filter((a) => a.type === 'crypto');

    let updatedCount = 0;
    if (cryptoAssets.length > 0) {
      const ids = cryptoAssets.map((a) => a.coingeckoId || a.id).filter(Boolean).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (res.ok) {
        const data = await res.json();
        const batch = writeBatch(db);
        const now = new Date();

        cryptoAssets.forEach((asset) => {
          const coin = data[asset.coingeckoId || asset.id];
          if (coin && typeof coin.usd === 'number') {
            batch.set(doc(db, 'assetPrices', asset.ticker), { ticker: asset.ticker, price: coin.usd, updatedAt: now }, { merge: true });
            batch.set(doc(db, 'assets', asset.id), { currentPrice: coin.usd }, { merge: true });
            updatedCount += 1;
          }
        });

        await batch.commit();
      }
    }

    return {
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} live market prices.`,
    };
  },
};
