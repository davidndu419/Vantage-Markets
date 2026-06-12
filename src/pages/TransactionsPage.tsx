/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMarketMode } from '../contexts/MarketModeContext';
import { transactionService } from '../services/transactionService';
import { assetService } from '../services/assetService';
import type { Transaction, Asset } from '../types';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { History } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentMarketMode } = useMarketMode();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Load assets to correlation types
  useEffect(() => {
    assetService.getAssets().then(setAssets).catch((err) => {
      console.error('Error fetching assets on transaction ledger:', err);
    });
  }, []);

  // Real-time synchronization of transactions
  useEffect(() => {
    if (!user) return;

    const unsubTx = transactionService.onUserTransactionsChange(
      user.uid,
      (fetchedTransactions) => {
        const userVisibleOnly = fetchedTransactions.filter(
          (tx) => tx.type !== 'admin_credit' && tx.visibleToUser === true
        );
        setTransactions(userVisibleOnly);
        setLoading(false);
      },
      100
    );

    return () => unsubTx();
  }, [user]);

  // Filter transactions locally by type and market mode
  const filteredTransactions = transactions.filter((tx) => {
    // Filter by action type
    if (activeFilter !== 'all' && tx.type !== activeFilter) return false;
    
    // Filter by global market mode
    const asset = assets.find((a) => a.id === tx.assetId || a.ticker === tx.ticker);
    return asset?.type === currentMarketMode;
  });

  // Ledger Table columns
  const columns: Column<Transaction>[] = [
    {
      header: 'Asset / Security',
      key: 'assetName',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-borderCustom/45 text-goldAccent font-extrabold text-[10px] border border-borderCustom select-none">
            {row.ticker.substring(0, 2)}
          </div>
          <div>
            <div className="text-textPrimary font-semibold text-xs sm:text-sm">{row.assetName}</div>
            <div className="text-[9px] sm:text-[10px] text-textSecondary font-mono uppercase tracking-wider mt-0.5">{row.ticker}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Operation Type',
      key: 'type',
      render: (row) => (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
          row.type === 'deposit'
            ? 'bg-success/5 text-success border-success/15'
            : 'bg-indigo-500/5 text-indigo-400 border-indigo-500/15'
        }`}>
          {row.type}
        </span>
      ),
    },
    {
      header: 'Amount (USD)',
      key: 'amount',
      render: (row) => (
        <span className="font-mono text-xs sm:text-sm font-bold text-textPrimary">
          ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Asset Yield',
      key: 'quantity',
      render: (row) => (
        <span className="font-mono text-xs text-textSecondary font-semibold">
          {row.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {row.ticker}
        </span>
      ),
    },
    {
      header: 'Execution Date',
      key: 'createdAt',
      render: (row) => {
        const date = row.createdAt instanceof Date ? row.createdAt : (row.createdAt as any).toDate();
        return (
          <span className="text-xs text-textSecondary font-medium">
            {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      header: 'Status Code',
      key: 'status',
      render: (row) => {
        const statusMap = {
          pending: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
          completed: 'bg-success/10 text-success border border-success/20',
          declined: 'bg-danger/10 text-danger border border-danger/20',
        };
        return (
          <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-[4px] border ${statusMap[row.status] || ''}`}>
            {row.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Background radial decoration */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Page Header */}
      <section>
        <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight flex items-center gap-2.5 uppercase">
          <History className="w-6 h-6 text-goldAccent" /> Transaction Ledger Accounts
        </h1>
        <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
          Secure audit statement logging representing all funding deposits and withdrawals in {currentMarketMode === 'stock' ? 'Stock Mode' : 'Crypto Mode'}.
        </p>
      </section>

      {/* Tab filters and selectors */}
      <section className="flex items-center justify-between border-b border-borderCustom/40 pb-3">
        <div className="flex bg-surface border border-borderCustom rounded-[6px] p-0.5 select-none">
          {(['all', 'deposit', 'withdrawal'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-[4px] transition-all duration-200 cursor-pointer ${
                activeFilter === filter
                  ? 'bg-goldAccent text-bgMain shadow-[0_0_8px_rgba(201,168,76,0.15)]'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              {filter === 'all' ? 'All Statements' : filter === 'deposit' ? 'Deposits Only' : 'Withdrawals Only'}
            </button>
          ))}
        </div>
      </section>

      {/* Table Data */}
      <section className="flex flex-col gap-4">
        {loading ? (
          <Loader variant="skeleton" count={4} />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title={`No Transaction Ledgers Logged`}
            description={`Your account holds no current transaction entries matching "${activeFilter}" in ${currentMarketMode === 'stock' ? 'Stocks' : 'Crypto'}.`}
          />
        ) : (
          <div className="bg-surface border border-borderCustom rounded-card overflow-hidden">
            <Table columns={columns} data={filteredTransactions} />
          </div>
        )}
      </section>
    </div>
  );
};

export default TransactionsPage;
