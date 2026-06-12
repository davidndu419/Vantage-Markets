/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { User as FirestoreUser } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: FirestoreUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: any = null;

    const finishLoading = () => {
      setLoading(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Timeout guard: force stop loading after 5 seconds if auth has not resolved
    timeoutId = setTimeout(() => {
      console.warn('[Vantage Auth] Initialization timeout reached. Forcing loading to false.');
      finishLoading();
    }, 5000);

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = authService.onAuthStateChanged(async (firebaseUser) => {
      try {
        // Clean up previous profile listener if any
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            // Start listening to the Firestore user profile document in real-time
            unsubscribeProfile = userService.onUserProfileChange(
              firebaseUser.uid,
              async (profile) => {
                if (profile) {
                  console.log('[Vantage Auth] Firestore user already exists:', firebaseUser.uid);
                  setUserProfile(profile);
                  finishLoading();
                } else {
                  console.warn('[Vantage Auth] Firestore user document does not exist for authenticated user:', firebaseUser.uid);
                  console.log('[Vantage Auth] Initiating self-healing profile creation...');
                  try {
                    // Automatically heal missing user profile document
                    await userService.createUserProfile(
                      firebaseUser.uid,
                      firebaseUser.displayName || 'Trader',
                      firebaseUser.email || ''
                    );
                    // No need to manually call finishLoading here as the profile listener will fire again with the new profile
                  } catch (createErr) {
                    console.error('[Vantage Auth] Self-healing profile creation failed:', createErr);
                    alert(`CRITICAL: Failed to initialize your user account profile in the database: ${(createErr as Error).message || createErr}`);
                    setUserProfile(null);
                    finishLoading();
                  }
                }
              },
              (error) => {
                console.error('Failed to load user profile document (async):', error);
                setUserProfile(null);
                finishLoading();
              }
            );
          } catch (error) {
            console.error('Failed to load user profile document (sync):', error);
            setUserProfile(null);
            finishLoading();
          }
        } else {
          setUserProfile(null);
          finishLoading();
        }
      } catch (error) {
        console.error('Error inside onAuthStateChanged handler:', error);
        setUserProfile(null);
        finishLoading();
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
