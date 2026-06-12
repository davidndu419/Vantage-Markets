import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Asset } from '../types';

export const assetService = {
  async getAssets(): Promise<Asset[]> {
    try {
      const assetsCollection = collection(db, 'assets');
      const assetsSnapshot = await getDocs(assetsCollection);
      return assetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Asset[];
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  },

  // Keep compatibility with any callers of getAllAssets
  async getAllAssets(): Promise<Asset[]> {
    return this.getAssets();
  },

  async getAssetById(assetId: string): Promise<Asset | null> {
    try {
      const assetDocRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetDocRef);
      if (assetDoc.exists()) {
        return {
          id: assetDoc.id,
          ...assetDoc.data(),
        } as Asset;
      }
      return null;
    } catch (error) {
      console.error('Error fetching asset by ID:', error);
      throw error;
    }
  },

  async getAssetsByType(type: 'stock' | 'crypto'): Promise<Asset[]> {
    try {
      const assetsCollection = collection(db, 'assets');
      const q = query(assetsCollection, where('type', '==', type));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Asset[];
    } catch (error) {
      console.error('Error fetching assets by type:', error);
      throw error;
    }
  },

  async getAssetPrice(ticker: string): Promise<number> {
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

  onAssetsChange(callback: (assets: Asset[]) => void) {
    const assetsCollection = collection(db, 'assets');
    return onSnapshot(
      assetsCollection,
      (snapshot) => {
        const assets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Asset[];
        callback(assets);
      },
      (error) => {
        console.error('Error listening to assets updates:', error);
      }
    );
  },
};

