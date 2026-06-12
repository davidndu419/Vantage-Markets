import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  User,
  UserTier,
  Holding,
  Transaction,
  Asset,
  DepositAddress,
  AdminCredit,
  AdminHoldingAction,
} from '../types';

export const adminService = {
  async getAllUsers(): Promise<User[]> {
    try {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        uid: d.id,
        tier: 'T1',
        ...d.data(),
      })) as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!data.tier) {
          await updateDoc(userRef, { tier: 'T1' });
        }
        return {
          tier: 'T1',
          ...data,
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  async freezeUserWithdrawal(userId: string, frozen: boolean, reason: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        withdrawalFrozen: frozen,
        freezeReason: frozen ? reason : '',
      });
    } catch (error) {
      console.error('Error updating withdrawal freeze state:', error);
      throw error;
    }
  },

  async updateUserTier(userId: string, tier: UserTier): Promise<void> {
    if (!['T1', 'T2', 'T3'].includes(tier)) {
      throw new Error('Invalid account tier.');
    }

    try {
      await updateDoc(doc(db, 'users', userId), { tier });
    } catch (error) {
      console.error('Error updating account tier:', error);
      throw error;
    }
  },

  async getUserHoldings(userId: string): Promise<Holding[]> {
    try {
      const holdingsCol = collection(db, 'holdings');
      const q = query(holdingsCol, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Holding[];
    } catch (error) {
      console.error('Error fetching user holdings:', error);
      throw error;
    }
  },

  async approveDeposit(transactionId: string): Promise<void> {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      
      await runTransaction(db, async (firebaseTransaction) => {
        const txDoc = await firebaseTransaction.get(txRef);
        if (!txDoc.exists()) {
          throw new Error('Transaction does not exist.');
        }

        const txData = txDoc.data() as Transaction;
        if (txData.status !== 'pending') {
          throw new Error('Transaction is already processed.');
        }

        if (txData.type !== 'deposit') {
          throw new Error('Transaction is not a deposit.');
        }

        const assetRef = doc(db, 'assets', txData.assetId);
        const assetDoc = await firebaseTransaction.get(assetRef);
        if (!assetDoc.exists()) {
          throw new Error('Deposit asset does not exist in the catalog.');
        }
        const assetData = assetDoc.data() as Asset;

        const holdingId = `${txData.userId}_${txData.assetId}`;
        const holdingRef = doc(db, 'holdings', holdingId);
        const holdingDoc = await firebaseTransaction.get(holdingRef);

        let newQty = txData.quantity;
        let exists = false;
        
        if (holdingDoc.exists()) {
          exists = true;
          const currentHolding = holdingDoc.data() as Holding;
          newQty = (currentHolding.quantity || 0) + txData.quantity;
        }

        // 1. Update/Create Holding
        firebaseTransaction.set(
          holdingRef,
          {
            userId: txData.userId,
            assetId: txData.assetId,
            assetName: txData.assetName,
            ticker: txData.ticker,
            type: assetData.type,
            quantity: newQty,
            createdAt: exists ? holdingDoc.data()?.createdAt : new Date(),
          },
          { merge: true }
        );

        // 2. Set Transaction completed
        firebaseTransaction.update(txRef, {
          status: 'completed',
        });
      });
    } catch (error) {
      console.error('Error approving deposit transaction:', error);
      throw error;
    }
  },

  async declineDeposit(transactionId: string): Promise<void> {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'declined',
      });
    } catch (error) {
      console.error('Error declining deposit transaction:', error);
      throw error;
    }
  },

  async approveWithdrawal(transactionId: string): Promise<void> {
    try {
      const txRef = doc(db, 'transactions', transactionId);

      await runTransaction(db, async (firebaseTransaction) => {
        const txDoc = await firebaseTransaction.get(txRef);
        if (!txDoc.exists()) {
          throw new Error('Transaction does not exist.');
        }

        const txData = txDoc.data() as Transaction;
        if (txData.status !== 'pending') {
          throw new Error('Transaction is already processed.');
        }

        if (txData.type !== 'withdrawal') {
          throw new Error('Transaction is not a withdrawal.');
        }

        const holdingId = `${txData.userId}_${txData.assetId}`;
        const holdingRef = doc(db, 'holdings', holdingId);
        const holdingDoc = await firebaseTransaction.get(holdingRef);

        if (!holdingDoc.exists()) {
          throw new Error('User does not hold this asset.');
        }

        const currentHolding = holdingDoc.data() as Holding;
        if ((currentHolding.quantity || 0) < txData.quantity) {
          throw new Error('Insufficient asset balance for this withdrawal request.');
        }

        const newQty = currentHolding.quantity - txData.quantity;

        // 1. Update Holding
        firebaseTransaction.set(
          holdingRef,
          {
            quantity: newQty,
          },
          { merge: true }
        );

        // 2. Set Transaction completed
        firebaseTransaction.update(txRef, {
          status: 'completed',
        });
      });
    } catch (error) {
      console.error('Error approving withdrawal transaction:', error);
      throw error;
    }
  },

  async declineWithdrawal(transactionId: string): Promise<void> {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'declined',
      });
    } catch (error) {
      console.error('Error declining withdrawal transaction:', error);
      throw error;
    }
  },

  async addAdminCredit(
    userId: string,
    assetId: string,
    quantityAdded: number
  ): Promise<void> {
    try {
      if (!Number.isFinite(quantityAdded) || quantityAdded <= 0) {
        throw new Error('Credit quantity must be greater than zero.');
      }

      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      if (!assetDoc.exists()) {
        throw new Error('Asset does not exist in catalog.');
      }
      const assetData = assetDoc.data() as Asset;

      const priceRef = doc(db, 'assetPrices', assetData.ticker);
      const holdingId = `${userId}_${assetId}`;
      const holdingRef = doc(db, 'holdings', holdingId);
      
      await runTransaction(db, async (firebaseTransaction) => {
        const priceDoc = await firebaseTransaction.get(priceRef);
        const holdingDoc = await firebaseTransaction.get(holdingRef);
        const priceAtTime = priceDoc.exists() ? Number(priceDoc.data().price) : 0;

        if (!Number.isFinite(priceAtTime) || priceAtTime <= 0) {
          throw new Error('Live price unavailable for this asset.');
        }

        const amountAdded = quantityAdded * priceAtTime;
        let newQty = quantityAdded;
        let exists = false;

        if (holdingDoc.exists()) {
          exists = true;
          const currentHolding = holdingDoc.data() as Holding;
          newQty = (currentHolding.quantity || 0) + quantityAdded;
        }

        // Update holding
        firebaseTransaction.set(
          holdingRef,
          {
            userId,
            assetId,
            assetName: assetData.name,
            ticker: assetData.ticker,
            type: assetData.type,
            quantity: newQty,
            createdAt: exists ? holdingDoc.data()?.createdAt : new Date(),
          },
          { merge: true }
        );

        // Create adminCredits document
        const creditColRef = doc(collection(db, 'adminCredits'));
        const creditData: AdminCredit = {
          id: creditColRef.id,
          userId,
          assetId,
          assetName: assetData.name,
          ticker: assetData.ticker,
          amountAdded,
          quantityAdded,
          priceAtTime,
          creditedBy: 'admin',
          createdAt: new Date(),
        };

        firebaseTransaction.set(creditColRef, creditData);
      });
    } catch (error) {
      console.error('Error adding admin credit:', error);
      throw error;
    }
  },

  async deleteUserHolding(userId: string, holdingId: string): Promise<void> {
    try {
      const holdingRef = doc(db, 'holdings', holdingId);
      const actionRef = doc(collection(db, 'adminHoldingActions'));

      await runTransaction(db, async (firebaseTransaction) => {
        const holdingDoc = await firebaseTransaction.get(holdingRef);
        if (!holdingDoc.exists()) {
          throw new Error('Holding no longer exists.');
        }

        const holding = holdingDoc.data() as Holding;
        if (holding.userId !== userId) {
          throw new Error('Holding does not belong to this user.');
        }

        const priceRef = doc(db, 'assetPrices', holding.ticker);
        const priceDoc = await firebaseTransaction.get(priceRef);
        const rawPrice = priceDoc.exists() ? Number(priceDoc.data().price) : 0;
        const priceAtTime = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;

        const actionData: AdminHoldingAction = {
          id: actionRef.id,
          userId,
          assetId: holding.assetId,
          assetName: holding.assetName,
          ticker: holding.ticker,
          type: holding.type,
          action: 'delete_holding',
          quantityRemoved: holding.quantity,
          estimatedValueAtTime: holding.quantity * priceAtTime,
          priceAtTime,
          performedBy: 'admin',
          createdAt: new Date(),
        };

        firebaseTransaction.delete(holdingRef);
        firebaseTransaction.set(actionRef, actionData);
      });
    } catch (error) {
      console.error('Error deleting user holding:', error);
      throw error;
    }
  },

  async addAsset(assetData: Omit<Asset, 'createdAt'>): Promise<void> {
    try {
      const assetRef = doc(db, 'assets', assetData.id);
      await setDoc(assetRef, {
        ...assetData,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error adding asset:', error);
      throw error;
    }
  },

  async updateAsset(assetId: string, assetData: Partial<Asset>): Promise<void> {
    try {
      const assetRef = doc(db, 'assets', assetId);
      await updateDoc(assetRef, assetData);
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  },

  async deleteAsset(assetId: string): Promise<void> {
    try {
      const assetRef = doc(db, 'assets', assetId);
      await deleteDoc(assetRef);
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  },

  async addDepositAddress(addrData: Omit<DepositAddress, 'id' | 'createdAt'>): Promise<void> {
    try {
      const addrRef = doc(collection(db, 'depositAddresses'));
      await setDoc(addrRef, {
        id: addrRef.id,
        ...addrData,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error adding deposit address:', error);
      throw error;
    }
  },

  async updateDepositAddress(addrId: string, addrData: Partial<DepositAddress>): Promise<void> {
    try {
      const addrRef = doc(db, 'depositAddresses', addrId);
      await updateDoc(addrRef, addrData);
    } catch (error) {
      console.error('Error updating deposit address:', error);
      throw error;
    }
  },

  async deleteDepositAddress(addrId: string): Promise<void> {
    try {
      const addrRef = doc(db, 'depositAddresses', addrId);
      await deleteDoc(addrRef);
    } catch (error) {
      console.error('Error deleting deposit address:', error);
      throw error;
    }
  },

  async setActiveAddress(addrId: string, network: string): Promise<void> {
    try {
      const addressesCollection = collection(db, 'depositAddresses');
      const q = query(addressesCollection, where('network', '==', network));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      
      querySnapshot.forEach((docSnapshot) => {
        const docRef = doc(db, 'depositAddresses', docSnapshot.id);
        if (docSnapshot.id === addrId) {
          batch.update(docRef, { active: true });
        } else {
          batch.update(docRef, { active: false });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error setting active deposit address:', error);
      throw error;
    }
  },

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const txCol = collection(db, 'transactions');
      const q = query(txCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      throw error;
    }
  },
};
export default adminService;
