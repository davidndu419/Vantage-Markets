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
};
