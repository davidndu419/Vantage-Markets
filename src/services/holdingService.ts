import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Holding } from '../types';

export const holdingService = {
  async getUserHoldings(userId: string): Promise<Holding[]> {
    try {
      const holdingsCollection = collection(db, 'holdings');
      const q = query(holdingsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Holding[];
    } catch (error) {
      console.error('Error fetching user holdings:', error);
      throw error;
    }
  },

  onHoldingsChange(userId: string, callback: (holdings: Holding[]) => void) {
    const holdingsCollection = collection(db, 'holdings');
    const q = query(holdingsCollection, where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const holdings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Holding[];
        callback(holdings);
      },
      (error) => {
        console.error('Error listening to holdings updates:', error);
      }
    );
  },
};
