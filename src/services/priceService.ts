import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AssetPrice, Holding } from '../types';

export const priceService = {
  async getPrice(ticker: string): Promise<number> {
    try {
      const priceDocRef = doc(db, 'assetPrices', ticker);
      const priceDoc = await getDoc(priceDocRef);
      if (priceDoc.exists()) {
        const data = priceDoc.data();
        return typeof data.price === 'number' ? data.price : Number(data.price || 0);
      }
      return 0;
    } catch (error) {
      console.error('Error fetching asset price:', error);
      throw error;
    }
  },

  async getPrices(): Promise<AssetPrice[]> {
    try {
      const pricesCollection = collection(db, 'assetPrices');
      const querySnapshot = await getDocs(pricesCollection);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data() as AssetPrice;
        return {
          ticker: doc.id,
          price: typeof data.price === 'number' ? data.price : Number(data.price || 0),
          updatedAt: data.updatedAt,
        };
      }) as AssetPrice[];
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw error;
    }
  },

  async getPriceMap(): Promise<Record<string, number>> {
    return this.getAllPrices();
  },

  calculatePortfolioValue(holdings: Holding[], prices: Record<string, number>): number {
    return holdings.reduce((sum, holding) => {
      const price = prices[holding.ticker] || 0;
      return sum + holding.quantity * price;
    }, 0);
  },

  async getAllPrices(): Promise<Record<string, number>> {
    try {
      const pricesCollection = collection(db, 'assetPrices');
      const querySnapshot = await getDocs(pricesCollection);
      const pricesMap: Record<string, number> = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AssetPrice;
        const ticker = data.ticker || doc.id;
        pricesMap[ticker] = typeof data.price === 'number' ? data.price : Number(data.price || 0);
      });
      return pricesMap;
    } catch (error) {
      console.error('Error fetching asset prices:', error);
      throw error;
    }
  },

  onPricesChange(callback: (prices: Record<string, number>) => void) {
    const pricesCollection = collection(db, 'assetPrices');
    return onSnapshot(
      pricesCollection,
      (snapshot) => {
        const pricesMap: Record<string, number> = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as AssetPrice;
          const ticker = data.ticker || doc.id;
          pricesMap[ticker] = typeof data.price === 'number' ? data.price : Number(data.price || 0);
        });
        callback(pricesMap);
      },
      (error) => {
        console.error('Error listening to asset prices updates:', error);
      }
    );
  },
};

