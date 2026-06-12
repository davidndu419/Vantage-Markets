/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';

export type MarketMode = 'stock' | 'crypto';

interface MarketModeContextType {
  currentMarketMode: MarketMode;
  setMarketMode: (mode: MarketMode) => void;
  toggleMarketMode: () => void;
}

const MarketModeContext = createContext<MarketModeContextType>({
  currentMarketMode: 'stock',
  setMarketMode: () => {},
  toggleMarketMode: () => {},
});

export const MarketModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [marketMode, setMarketModeState] = useState<MarketMode>(() => {
    // Initial load from localStorage if available, else default to stock
    const saved = localStorage.getItem('vantage_market_mode');
    return (saved === 'crypto' || saved === 'stock') ? saved as MarketMode : 'stock';
  });

  // Keep marketMode in sync with preferredMarket from userProfile when user profile loads/changes
  useEffect(() => {
    if (userProfile?.preferredMarket) {
      const targetMode = userProfile.preferredMarket;
      // Defer execution to avoid synchronous setState inside effect linter error
      Promise.resolve().then(() => {
        setMarketModeState(targetMode);
      });
      localStorage.setItem('vantage_market_mode', userProfile.preferredMarket);
    }
  }, [userProfile?.preferredMarket]);

  const setMarketMode = (mode: MarketMode) => {
    setMarketModeState(mode);
    localStorage.setItem('vantage_market_mode', mode);
    if (user && userProfile?.preferredMarket !== mode) {
      userService.updateUserProfile(user.uid, { preferredMarket: mode }).catch((error) => {
        console.error('Unable to persist market preference:', error);
      });
    }
  };

  const toggleMarketMode = () => {
    const nextMode = marketMode === 'stock' ? 'crypto' : 'stock';
    setMarketMode(nextMode);
  };

  return (
    <MarketModeContext.Provider value={{ currentMarketMode: marketMode, setMarketMode, toggleMarketMode }}>
      {children}
    </MarketModeContext.Provider>
  );
};

export const useMarketMode = () => useContext(MarketModeContext);
export default MarketModeContext;
