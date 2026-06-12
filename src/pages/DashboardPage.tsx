/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketMode } from '../contexts/MarketModeContext';
import { holdingService } from '../services/holdingService';
import { priceService } from '../services/priceService';
import { transactionService } from '../services/transactionService';
import { assetService } from '../services/assetService';
import type { Holding, Transaction, Asset } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { AssetLogo } from '../components/AssetLogo';
import { getHoldingAsset } from '../utils/assetIdentity';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  History
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { currentMarketMode, setMarketMode } = useMarketMode();
  
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  
  // 1. Fetch data
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

    const unsubTransactions = transactionService.onUserTransactionsChange(user.uid, (fetchedTransactions) => {
      // Exclude admin_credits and only show visible transactions
      const userVisibleOnly = fetchedTransactions.filter(
        (tx) => tx.type !== 'admin_credit' && tx.visibleToUser === true
      );
      setTransactions(userVisibleOnly);
      setLoadingTransactions(false);
    });

    // Fetch assets list to know type
    assetService.getAssets().then(setAssets).catch((err) => {
      console.error('Error fetching assets on dashboard:', err);
    });

    return () => {
      unsubHoldings();
      unsubPrices();
      unsubTransactions();
    };
  }, [user]);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Calculate portfolio value specifically for the active market mode
  const portfolioValue = holdings.reduce((sum, holding) => {
    if (holding.type !== currentMarketMode) return sum;
    const currentPrice = prices[holding.ticker] || 0;
    return sum + holding.quantity * currentPrice;
  }, 0);

  // Filter holdings & transactions by market mode
  const filteredHoldings = holdings.filter((holding) => holding.type === currentMarketMode);
  
  const filteredTransactions = transactions.filter((tx) => {
    const asset = assets.find((a) => a.id === tx.assetId || a.ticker === tx.ticker);
    return asset?.type === currentMarketMode;
  });
  const marketAssets = assets.filter((asset) => asset.type === currentMarketMode);

  const holdingsColumns: Column<Holding>[] = [
    {
      header: 'Asset',
      key: 'assetName',
      render: (row) => {
        const asset = getHoldingAsset(assets, row.assetId, row.ticker);
        return (
          <div className="flex items-center gap-3">
          <AssetLogo
            name={row.assetName}
            ticker={row.ticker}
            logoUrl={asset?.logoUrl}
            className="h-8 w-8"
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
      header: 'Balance',
      key: 'quantity',
      render: (row) => (
        <span className="font-mono text-textPrimary text-xs sm:text-sm">
          {row.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </span>
      ),
    },
    {
      header: 'Price',
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
      header: 'Value',
      key: 'value',
      render: (row) => {
        const price = prices[row.ticker] || 0;
        const val = row.quantity * price;
        return (
          <span className="font-mono text-goldAccent font-semibold text-xs sm:text-sm">
            ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Background decor */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header greeting */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight">
            {getGreeting()}, {userProfile?.name?.split(' ')[0] || 'Trader'}
          </h1>
          <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
            Secure Trading Room Node • {currentMarketMode === 'stock' ? 'Stock Mode' : 'Crypto Mode'} active
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            className="text-xs font-bold uppercase tracking-wider min-h-[40px] h-10 px-4 w-full sm:w-auto border border-borderCustom"
            onClick={() => navigate('/portfolio')}
          >
            <Briefcase className="w-4 h-4 mr-2" /> View Portfolio Ledger
          </Button>
        </div>
      </section>

      {/* Portfolio Balance and CTAs grid */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* Main Portfolio Value Card */}
        <Card variant="elevated" className="lg:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 glow-card">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-xs font-bold text-textSecondary uppercase tracking-widest">Net Mode Equity</span>
              
              {/* Market mode toggle switcher */}
              <div className="flex bg-bgMain border border-borderCustom rounded-[6px] p-0.5 select-none">
                <button
                  onClick={() => setMarketMode('stock')}
                  className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-[4px] transition-all duration-200 cursor-pointer ${
                    currentMarketMode === 'stock'
                      ? 'bg-goldAccent text-bgMain shadow-[0_0_8px_rgba(201,168,76,0.2)]'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Stocks
                </button>
                <button
                  onClick={() => setMarketMode('crypto')}
                  className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-[4px] transition-all duration-200 cursor-pointer ${
                    currentMarketMode === 'crypto'
                      ? 'bg-goldAccent text-bgMain shadow-[0_0_8px_rgba(201,168,76,0.2)]'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Crypto
                </button>
              </div>
            </div>

            {loadingHoldings || loadingPrices ? (
              <div className="h-10 w-48 bg-borderCustom/40 animate-pulse rounded" />
            ) : (
              <div className="text-3xl md:text-4xl lg:text-5xl font-black text-goldAccent font-mono tracking-tight">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <span className="text-[10px] text-textSecondary/70 font-semibold tracking-wider uppercase mt-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" /> Live calculated mode balance
            </span>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto shrink-0">
            <Button
              variant="primary"
              className="flex-1 md:flex-none text-xs font-extrabold uppercase tracking-widest min-h-[44px] h-11"
              onClick={() => navigate('/deposit')}
            >
              <ArrowDownLeft className="w-4 h-4 mr-1.5" /> Deposit
            </Button>
            <Button
              variant="secondary"
              className="flex-1 md:flex-none text-xs font-extrabold uppercase tracking-widest min-h-[44px] h-11 border border-borderCustom"
              onClick={() => navigate('/withdraw')}
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> Withdraw
            </Button>
          </div>
        </Card>

        {/* Account Integrity */}
        <Card variant="standard" className="flex flex-col justify-between p-6">
          <div>
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4">Account Integrity</h4>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between border-b border-borderCustom/40 pb-2">
                <span className="text-xs font-medium text-textSecondary">Active Holdings</span>
                <span className="text-xs font-bold font-mono text-textPrimary">{filteredHoldings.length} assets</span>
              </div>
              <div className="flex justify-between border-b border-borderCustom/40 pb-2">
                <span className="text-xs font-medium text-textSecondary">Market Assets</span>
                <span className="text-xs font-bold font-mono text-textPrimary">{marketAssets.length} listed</span>
              </div>
              <div className="flex justify-between border-b border-borderCustom/40 pb-2">
                <span className="text-xs font-medium text-textSecondary">Account Mode</span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-goldAccent">
                  {currentMarketMode}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Seeded market library summary */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-borderCustom/40 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-textPrimary">
            <TrendingUp className="w-4 h-4 text-goldAccent" /> Live {currentMarketMode === 'stock' ? 'Stock' : 'Crypto'} Market Summary
          </h3>
          <button
            className="text-[10px] font-bold uppercase tracking-wider text-textSecondary hover:text-goldAccent cursor-pointer"
            onClick={() => navigate('/deposit')}
          >
            View All Assets
          </button>
        </div>

        {marketAssets.length === 0 ? (
          <EmptyState
            title={`No ${currentMarketMode === 'stock' ? 'Stock' : 'Crypto'} Assets Available`}
            description={`The ${currentMarketMode} investment library has not been configured yet.`}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketAssets.slice(0, 5).map((asset) => (
              <Card
                key={asset.id}
                variant="standard"
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-goldAccent/40"
                onClick={() => navigate(`/deposit/${asset.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AssetLogo name={asset.name} ticker={asset.ticker} logoUrl={asset.logoUrl} className="h-9 w-9" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-textPrimary truncate">{asset.name}</div>
                    <div className="text-[9px] text-textSecondary font-mono uppercase mt-0.5">{asset.ticker}</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-goldAccent">
                  ${(prices[asset.ticker] || asset.currentPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Holdings & Transactions Section */}
      <section className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Active Positions */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-borderCustom/40 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-textPrimary">
              <Briefcase className="w-4 h-4 text-goldAccent" /> Active {currentMarketMode === 'stock' ? 'Stocks' : 'Crypto'} Positions
            </h3>
          </div>

          {loadingHoldings || loadingPrices ? (
            <Loader variant="skeleton" count={3} />
          ) : filteredHoldings.length === 0 ? (
            <EmptyState
              title={`No Active ${currentMarketMode === 'crypto' ? 'Cryptocurrencies' : 'Stock Positions'}`}
              description={`Your account holds no current position in ${currentMarketMode === 'crypto' ? 'digital currencies' : 'public stocks'}. Fund your account to start trading.`}
              actionText="Execute Deposit"
              onAction={() => navigate('/deposit')}
            />
          ) : (
            <div className="bg-surface border border-borderCustom rounded-card overflow-hidden">
              <Table columns={holdingsColumns} data={filteredHoldings} />
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-borderCustom/40 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-textPrimary">
              <History className="w-4 h-4 text-goldAccent" /> Recent {currentMarketMode === 'stock' ? 'Stock' : 'Crypto'} Transactions
            </h3>
            <button
              className="text-[10px] font-bold uppercase tracking-wider text-textSecondary hover:text-goldAccent cursor-pointer"
              onClick={() => navigate('/transactions')}
            >
              Full Ledger
            </button>
          </div>

          {loadingTransactions ? (
            <Loader variant="skeleton" count={2} />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              title="No Ledger Records"
              description={`There are no ${currentMarketMode === 'stock' ? 'stock' : 'crypto'} transactions logged on this account.`}
              className="p-6"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTransactions.slice(0, 4).map((tx) => {
                const date = tx.createdAt instanceof Date ? tx.createdAt : (tx.createdAt as any).toDate();
                const asset = assets.find((a) => a.id === tx.assetId || a.ticker === tx.ticker);
                const statusMap = {
                  pending: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
                  completed: 'bg-success/10 text-success border border-success/20',
                  declined: 'bg-danger/10 text-danger border border-danger/20',
                };
                return (
                  <Card key={tx.id} variant="standard" className="p-4 flex justify-between items-center bg-surface hover:border-gray-800">
                    <div className="flex items-center gap-3">
                      <AssetLogo
                        name={tx.assetName}
                        ticker={tx.ticker}
                        logoUrl={asset?.logoUrl}
                        className="h-8 w-8"
                      />
                      <div>
                        <div className="text-xs font-bold text-textPrimary uppercase tracking-wider">{tx.assetName}</div>
                        <div className="text-[9px] text-textSecondary font-mono uppercase mt-0.5">
                          {tx.type} • {date.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-mono text-sm font-bold text-textPrimary">
                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${statusMap[tx.status]}`}>
                        {tx.status}
                      </span>
                      {tx.status === 'declined' && (
                        <button
                          onClick={() => navigate('/support')}
                          className="text-[8px] font-extrabold text-danger hover:text-danger/80 uppercase tracking-wider block mt-0.5 whitespace-nowrap underline cursor-pointer focus:outline-none"
                        >
                          CONTACT SUPPORT
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
