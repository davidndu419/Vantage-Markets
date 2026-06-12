/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User } from '../types';

export const userService = {
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        return {
          tier: 'T1',
          ...userSnapshot.data(),
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  async createUserProfile(uid: string, name: string, email: string): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userData: User = {
        uid,
        name,
        email,
        createdAt: new Date(),
        role: 'user',
        tier: 'T1',
        withdrawalFrozen: false,
        freezeReason: '',
        preferredMarket: null,
        onboardingCompleted: false,
      };
      await setDoc(userDocRef, userData);
      console.log('[Vantage Auth] Firestore user created:', uid);
    } catch (error) {
      console.error('Error creating user profile in Firestore:', error);
      throw error;
    }
  },

  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, data);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  onUserProfileChange(uid: string, callback: (user: User | null) => void, onError?: (error: any) => void) {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as Partial<User>;
          const tier = data.tier || 'T1';
          callback({ ...data, tier } as User);

          if (!data.tier) {
            updateDoc(userDocRef, { tier: 'T1' }).catch((error) => {
              console.error('Error backfilling user tier:', error);
            });
          }
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error listening to user profile changes:', error);
        if (onError) onError(error);
      }
    );
  },
};
