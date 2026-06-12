/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketMode } from '../contexts/MarketModeContext';
import { assetService } from '../services/assetService';
import { priceService } from '../services/priceService';
import type { Asset } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { AssetLogo } from '../components/AssetLogo';
import { Coins, TrendingUp } from 'lucide-react';

export const DepositPage: React.FC = () => {
  const navigate = useNavigate();
  useAuth();
  const { currentMarketMode } = useMarketMode();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Listen to real-time prices
  useEffect(() => {
    const unsubPrices = priceService.onPricesChange((pricesMap) => {
      setPrices(pricesMap);
      setLoadingPrices(false);
    });
    return () => unsubPrices();
  }, []);

  // 2. Fetch assets from service layer
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoadingAssets(true);
        setError(null);
        const fetchedAssets = await assetService.getAssets();
        setAssets(fetchedAssets);
      } catch (err: any) {
        console.error('Error fetching assets:', err);
        setError('Failed to load available assets. Please try again.');
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  // Filter assets by current market mode selection
  const filteredAssets = assets.filter((asset) => asset.type === currentMarketMode);

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <section>
        <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight flex items-center gap-2.5 uppercase">
          <Coins className="w-6 h-6 text-goldAccent" /> Invest in {currentMarketMode === 'stock' ? 'Stocks' : 'Crypto'}
        </h1>
        <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
          Select a {currentMarketMode === 'stock' ? 'stock' : 'crypto'} asset to begin your secured funding sequence.
        </p>
      </section>

      {/* Content Area */}
      {error ? (
        <Card variant="standard" className="p-8 text-center border-danger/20 bg-danger/5">
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" className="mt-4 text-xs font-bold uppercase tracking-wider" onClick={() => navigate(0)}>
            Retry Connection
          </Button>
        </Card>
      ) : loadingAssets || loadingPrices ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Loader variant="skeleton" count={3} />
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card variant="standard" className="p-10 text-center flex flex-col items-center justify-center border-borderCustom">
          <p className="text-sm text-textSecondary font-medium">
            No {currentMarketMode === 'stock' ? 'stock' : 'crypto'} assets are currently available.
          </p>
        </Card>
      ) : (
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => {
            const currentPrice = prices[asset.ticker] || 0;
            return (
              <Card
                key={asset.id}
                variant="standard"
                className="p-6 flex flex-col justify-between glow-card bg-surface hover:scale-[1.01] transition-all duration-300"
              >
                <div>
                  {/* Top Row: Symbol & Type Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <AssetLogo name={asset.name} ticker={asset.ticker} logoUrl={asset.logoUrl} />
                      <div>
                        <h3 className="text-sm font-bold text-textPrimary leading-tight">{asset.name}</h3>
                        <span className="text-[10px] text-textSecondary font-mono uppercase tracking-wider">{asset.ticker}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-textSecondary bg-borderCustom/30 border border-borderCustom px-2 py-0.5 rounded">
                      {asset.type}
                    </span>
                  </div>

                  {/* Spot Pricing Row */}
                  <div className="mb-6">
                    <span className="text-[10px] text-textSecondary uppercase tracking-wider block mb-1">Current Spot Price</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono text-textPrimary">
                        ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-success font-semibold flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Action Button */}
                <Button
                  variant="primary"
                  className="w-full text-xs font-bold uppercase tracking-widest h-10 min-h-[40px]"
                  onClick={() => navigate(`/deposit/${asset.id}`)}
                >
                  Select Asset
                </Button>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default DepositPage;
