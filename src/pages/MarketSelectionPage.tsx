import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Card } from '../components/Card';
import { TrendingUp, Coins, ChevronRight } from 'lucide-react';

export const MarketSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMarket = async (market: 'stock' | 'crypto') => {
    if (!user) return;
    setIsSubmitting(market);
    setError(null);

    try {
      await userService.updateUserProfile(user.uid, {
        preferredMarket: market,
        onboardingCompleted: true,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to set preferred market:', err);
      setError('Failed to save your preference. Please try again.');
      setIsSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-bgMain text-textPrimary flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-[-20%] left-[-20%] h-[70vw] w-[70vw] bg-goldAccent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[70vw] w-[70vw] bg-[#EF4444]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-12 select-none">
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-goldAccent text-bgMain font-extrabold text-2xl border border-goldAccent/40 shadow-[0_0_20px_rgba(201,168,76,0.25)]">
          VM
        </div>
        <div>
          <span className="font-extrabold text-2xl tracking-wider text-textPrimary">VANTAGE</span>
          <span className="font-medium text-sm tracking-[0.25em] text-goldAccent block -mt-1 uppercase">
            MARKETS
          </span>
        </div>
      </div>

      <div className="w-full max-w-3xl text-center mb-10 relative z-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wider uppercase text-textPrimary mb-4">
          Choose Your Trading Focus
        </h1>
        <p className="text-sm md:text-base text-textSecondary max-w-xl mx-auto font-medium leading-relaxed">
          Start with the market that best matches your investment strategy. You can switch anytime.
        </p>
      </div>

      {error && (
        <div className="mb-6 w-full max-w-2xl p-4 rounded-[8px] bg-danger/10 border border-danger/20 text-xs font-semibold text-danger tracking-wide flex items-center gap-3 animate-fadeIn relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl relative z-10">
        {/* Stocks Card */}
        <Card
          variant="elevated"
          className="group relative cursor-pointer overflow-hidden border border-borderCustom hover:border-goldAccent/40 p-8 flex flex-col items-center justify-between text-center min-h-[300px]"
          onClick={() => !isSubmitting && handleSelectMarket('stock')}
        >
          {isSubmitting === 'stock' && (
            <div className="absolute inset-0 bg-bgMain/70 backdrop-blur-sm flex items-center justify-center z-20">
              <svg className="animate-spin h-8 w-8 text-goldAccent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-goldAccent/10 border border-goldAccent/20 flex items-center justify-center text-goldAccent mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-textPrimary mb-3">
              STOCKS
            </h2>
            <p className="text-sm text-textSecondary font-medium leading-relaxed px-2">
              Invest in leading public companies and build long-term wealth.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-goldAccent group-hover:text-textPrimary transition-colors duration-300">
            <span>Select Stocks</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Card>

        {/* Crypto Card */}
        <Card
          variant="elevated"
          className="group relative cursor-pointer overflow-hidden border border-borderCustom hover:border-goldAccent/40 p-8 flex flex-col items-center justify-between text-center min-h-[300px]"
          onClick={() => !isSubmitting && handleSelectMarket('crypto')}
        >
          {isSubmitting === 'crypto' && (
            <div className="absolute inset-0 bg-bgMain/70 backdrop-blur-sm flex items-center justify-center z-20">
              <svg className="animate-spin h-8 w-8 text-goldAccent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-goldAccent/10 border border-goldAccent/20 flex items-center justify-center text-goldAccent mb-6 group-hover:scale-110 transition-transform duration-300">
              <Coins className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-textPrimary mb-3">
              CRYPTO
            </h2>
            <p className="text-sm text-textSecondary font-medium leading-relaxed px-2">
              Access digital assets and participate in the blockchain economy.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-goldAccent group-hover:text-textPrimary transition-colors duration-300">
            <span>Select Crypto</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Card>
      </div>

      <div className="mt-12 text-center text-xs text-textSecondary font-medium relative z-10">
        LoggedIn as: <span className="text-textPrimary font-semibold">{userProfile?.email || user?.email}</span>
      </div>
    </div>
  );
};
