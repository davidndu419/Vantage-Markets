import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketMode } from '../contexts/MarketModeContext';
import { holdingService } from '../services/holdingService';
import { priceService } from '../services/priceService';
import { assetService } from '../services/assetService';
import type { Asset, Holding } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { AssetLogo } from '../components/AssetLogo';
import { getHoldingAsset } from '../utils/assetIdentity';
import {
  Briefcase,
  PieChart,
  ArrowDownLeft
} from 'lucide-react';

export const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentMarketMode } = useMarketMode();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Real-time fetching of holdings and prices
  useEffect(() => {
    if (!user) return;

    const unsubHoldings = holdingService.onHoldingsChange(user.uid, (fetchedHoldings) => {
      setHoldings(fetchedHoldings);
      setLoadingHoldings(false);
    });

    const unsubPrices = priceService.onPricesChange((pricesMap) => {
      setPrices(pricesMap);
      setLoadingPrices(false);
    });

    assetService.getAssets().then(setAssets).catch((error) => {
      console.error('Error fetching portfolio asset metadata:', error);
    });

    return () => {
      unsubHoldings();
      unsubPrices();
    };
  }, [user]);

  const filteredHoldings = holdings.filter((holding) => holding.type === currentMarketMode);
  const marketAssets = assets.filter((asset) => asset.type === currentMarketMode);
  const activeValuation = filteredHoldings.reduce((sum, holding) => {
    const price = prices[holding.ticker] || 0;
    return sum + holding.quantity * price;
  }, 0);

  // Table columns
  const portfolioColumns: Column<Holding>[] = [
    {
      header: 'Asset Name',
      key: 'assetName',
      render: (row) => {
        const asset = getHoldingAsset(assets, row.assetId, row.ticker);
        return (
          <div className="flex items-center gap-3.5">
          <AssetLogo
            name={row.assetName}
            ticker={row.ticker}
            logoUrl={asset?.logoUrl}
            className="h-9 w-9"
          />
          <div>
            <div className="text-textPrimary font-semibold text-xs sm:text-sm">{row.assetName}</div>
            <div className="text-textSecondary text-[9px] sm:text-[10px] tracking-wider uppercase font-mono mt-0.5">{row.ticker}</div>
          </div>
        </div>
        );
      },
    },
    {
      header: 'Asset Type',
      key: 'type',
      render: (row) => (
        <span className="text-[9px] font-bold uppercase tracking-widest text-textSecondary bg-borderCustom/25 border border-borderCustom px-2 py-0.5 rounded">
          {row.type}
        </span>
      ),
    },
    {
      header: 'Units Held',
      key: 'quantity',
      render: (row) => (
        <span className="font-mono text-textPrimary text-xs sm:text-sm font-semibold">
          {row.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </span>
      ),
    },
    {
      header: 'Market Price',
      key: 'price',
      render: (row) => {
        const price = prices[row.ticker] || 0;
        return (
          <span className="font-mono text-textSecondary text-xs">
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: 'Current Valuation',
      key: 'value',
      render: (row) => {
        const price = prices[row.ticker] || 0;
        const value = row.quantity * price;
        const allocationPercent = activeValuation > 0 ? (value / activeValuation) * 100 : 0;
        return (
          <div>
            <div className="font-mono text-goldAccent font-semibold text-xs sm:text-sm">
              ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-textSecondary tracking-wide mt-0.5 font-medium">
              {allocationPercent.toFixed(1)}% weight
            </div>
          </div>
        );
      },
    },
  ];

  // Helper for empty state copy
  const getEmptyStateText = () => {
    if (currentMarketMode === 'stock') {
      return {
        title: 'No Stock Holdings',
        description: 'You have not opened any stock positions yet. Explore available public equity markets.'
      };
    }
    return {
      title: 'No Crypto Holdings',
      description: 'You have not opened any crypto positions yet. Explore available digital token networks.'
    };
  };

  const emptyText = getEmptyStateText();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight flex items-center gap-2.5 uppercase">
            <Briefcase className="w-6 h-6 text-goldAccent" /> {currentMarketMode === 'stock' ? 'Stock' : 'Crypto'} Portfolio
          </h1>
          <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
            Your {currentMarketMode === 'stock' ? 'stock positions and equity allocations' : 'digital asset positions and token allocations'}.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/deposit')}
          className="text-xs font-bold uppercase tracking-wider h-10 min-h-[40px] px-4 w-full sm:w-auto"
        >
          <ArrowDownLeft className="w-4 h-4 mr-2" /> Quick Deposit
        </Button>
      </div>

      {/* Portfolio Stats Panels */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="flex flex-col justify-between p-6 glow-card">
          <div>
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest block mb-1">Active Ledger Weight</span>
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
              {currentMarketMode === 'crypto' ? 'Crypto Market Mode' : 'Stock Market Mode'}
            </span>
          </div>
          {loadingHoldings || loadingPrices ? (
            <div className="h-8 w-36 bg-borderCustom/45 animate-pulse rounded mt-4" />
          ) : (
            <div className="text-3xl font-extrabold font-mono text-goldAccent mt-4">
              ${activeValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </Card>

        <Card variant="standard" className="flex flex-col justify-between p-6">
          <div>
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest block mb-1">Market Allocation</span>
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
              {currentMarketMode === 'stock' ? 'Stock positions only' : 'Crypto positions only'}
            </span>
          </div>
          {loadingHoldings || loadingPrices ? (
            <div className="h-5 w-full bg-borderCustom/45 animate-pulse rounded mt-5" />
          ) : (
            <div className="mt-4">
              <div className="flex h-2.5 w-full bg-borderCustom rounded-full overflow-hidden">
                <div className="w-full bg-goldAccent" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-textSecondary font-mono mt-2">
                100% {currentMarketMode === 'stock' ? 'Stock Ecosystem' : 'Crypto Ecosystem'}
              </div>
            </div>
          )}
        </Card>

        <Card variant="standard" className="flex flex-col justify-between p-6 sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest block mb-1">Desk Assets Count</span>
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Active Spot Targets</span>
          </div>
          <div className="text-2xl font-extrabold text-textPrimary mt-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-goldAccent" /> {filteredHoldings.length} Positions
          </div>
          <span className="text-[10px] text-textSecondary uppercase tracking-wider mt-2">
            {marketAssets.length} assets listed in this market
          </span>
        </Card>
      </section>

      {/* Current ecosystem positions */}
      <section className="flex flex-col gap-5">
        <div className="border-b border-borderCustom/40 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">
            Active {currentMarketMode === 'stock' ? 'Stock' : 'Crypto'} Positions
          </h2>
        </div>

        {/* Table display */}
        {loadingHoldings || loadingPrices ? (
          <Loader variant="skeleton" count={4} />
        ) : filteredHoldings.length === 0 ? (
          <div className="flex flex-col gap-5">
            <EmptyState
              title={emptyText.title}
              description={emptyText.description}
              actionText="Execute Deposit"
              onAction={() => navigate('/deposit')}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {assets
                .filter((asset) => asset.type === currentMarketMode)
                .slice(0, 4)
                .map((asset) => (
                  <Card
                    key={asset.id}
                    variant="standard"
                    className="p-4 flex items-center gap-3 cursor-pointer hover:border-goldAccent/40"
                    onClick={() => navigate(`/deposit/${asset.id}`)}
                  >
                    <AssetLogo name={asset.name} ticker={asset.ticker} logoUrl={asset.logoUrl} className="h-9 w-9" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-textPrimary truncate">{asset.name}</div>
                      <div className="text-[9px] text-textSecondary font-mono mt-0.5">{asset.ticker}</div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-borderCustom rounded-card overflow-hidden">
            <Table
              columns={portfolioColumns}
              data={filteredHoldings}
              mobileRender={(row) => {
                const asset = getHoldingAsset(assets, row.assetId, row.ticker);
                const price = prices[row.ticker] || 0;
                const value = row.quantity * price;
                const allocationPercent = activeValuation > 0 ? (value / activeValuation) * 100 : 0;
                return (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AssetLogo
                          name={row.assetName}
                          ticker={row.ticker}
                          logoUrl={asset?.logoUrl}
                          className="h-8 w-8"
                        />
                        <div>
                          <div className="text-xs font-bold text-textPrimary">{row.assetName}</div>
                          <div className="text-[9px] text-textSecondary font-mono uppercase mt-0.5">
                            {row.ticker} • <span className="text-[9px] font-bold uppercase tracking-widest text-textSecondary bg-borderCustom/25 border border-borderCustom px-1.5 py-0.5 rounded">{row.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-goldAccent font-semibold text-sm">
                          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-textSecondary tracking-wide mt-0.5 font-medium">
                          {allocationPercent.toFixed(1)}% weight
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-borderCustom/20 pt-2 text-[11px]">
                      <div>
                        <span className="text-textSecondary uppercase font-medium">Units: </span>
                        <span className="font-mono text-textPrimary font-semibold">
                          {row.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-textSecondary uppercase font-medium">Price: </span>
                        <span className="font-mono text-textSecondary">
                          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default PortfolioPage;
