import { collection, getDocs, onSnapshot, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Transaction } from '../types';

export const transactionService = {
  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    try {
      const transactionsCollection = collection(db, 'transactions');
      const docRef = await addDoc(transactionsCollection, {
        ...transactionData,
        createdAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  async getUserTransactions(userId: string, maxLimit = 50): Promise<Transaction[]> {
    try {
      const transactionsCollection = collection(db, 'transactions');
      const q = query(
        transactionsCollection,
        where('userId', '==', userId),
        where('visibleToUser', '==', true),
        where('type', 'in', ['deposit', 'withdrawal']),
        orderBy('createdAt', 'desc'),
        limit(maxLimit)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      throw error;
    }
  },

  onUserTransactionsChange(userId: string, callback: (transactions: Transaction[]) => void, maxLimit = 50) {
    const transactionsCollection = collection(db, 'transactions');
    const q = query(
      transactionsCollection,
      where('userId', '==', userId),
      where('visibleToUser', '==', true),
      where('type', 'in', ['deposit', 'withdrawal']),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        const transactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        callback(transactions);
      },
      (error) => {
        console.error('Error listening to transactions updates:', error);
      }
    );
  },
};

