/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminService } from '../../services/adminService';
import type { User, UserTier, Holding, Transaction, Asset } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Loader } from '../../components/Loader';
import { Modal } from '../../components/Modal';
import {
  ArrowLeft,
  Lock,
  Coins,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Save,
  Check,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Freeze withdrawal local states
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [savingFreeze, setSavingFreeze] = useState(false);
  const [selectedTier, setSelectedTier] = useState<UserTier>('T1');
  const [savingTier, setSavingTier] = useState(false);

  // Admin Credit Modal local states
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [creditQuantity, setCreditQuantity] = useState('');
  const [savingCredit, setSavingCredit] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<Holding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState(false);

  // Approval actions loading states
  const [actioningTxId, setActioningTxId] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // 1. Fetch user profile
      const userDoc = await adminService.getUserById(userId);
      if (!userDoc) {
        setProfile(null);
        return;
      }
      setProfile(userDoc);
      setIsFrozen(userDoc.withdrawalFrozen || false);
      setFreezeReason(userDoc.freezeReason || '');
      setSelectedTier(userDoc.tier || 'T1');

      // 2. Fetch holdings
      const userHoldings = await adminService.getUserHoldings(userId);
      setHoldings(userHoldings);

      // 3. Fetch user transactions (filter system-wide list by user)
      const allTransactions = await adminService.getAllTransactions();
      const userTxs = allTransactions.filter((tx) => tx.userId === userId);
      setTransactions(userTxs);

      // 4. Fetch available assets for dropdown selection
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      const assetList = assetsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Asset[];
      setAssets(assetList);
      if (assetList.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetList[0].id);
      }

      const pricesSnapshot = await getDocs(collection(db, 'assetPrices'));
      setPrices(
        pricesSnapshot.docs.reduce<Record<string, number>>((result, priceDoc) => {
          const data = priceDoc.data();
          result[data.ticker || priceDoc.id] = Number(data.price) || 0;
          return result;
        }, {})
      );
    } catch (error) {
      console.error('Error fetching details for user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async () => {
    if (!userId || savingTier) return;

    setSavingTier(true);
    try {
      await adminService.updateUserTier(userId, selectedTier);
      setProfile((current) => current ? { ...current, tier: selectedTier } : current);
      alert('Account tier updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update account tier.');
    } finally {
      setSavingTier(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const handleUpdateFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || savingFreeze) return;

    setSavingFreeze(true);
    try {
      await adminService.freezeUserWithdrawal(userId, isFrozen, freezeReason);
      alert('Withdrawal permissions updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update withdrawal permissions.');
    } finally {
      setSavingFreeze(false);
    }
  };

  const handleExecuteCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedAssetId || savingCredit) return;

    const qtyNum = parseFloat(creditQuantity);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      alert('Please enter a valid credit quantity.');
      return;
    }

    setSavingCredit(true);
    try {
      await adminService.addAdminCredit(userId, selectedAssetId, qtyNum);
      alert('Admin credit assigned successfully. No public transaction log was created.');
      setIsCreditModalOpen(false);
      setCreditQuantity('');
      await fetchUserData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute admin credit.');
    } finally {
      setSavingCredit(false);
    }
  };

  const handleDeleteHolding = async () => {
    if (!userId || !holdingToDelete?.id || deletingHolding) return;

    setDeletingHolding(true);
    try {
      await adminService.deleteUserHolding(userId, holdingToDelete.id);
      setHoldingToDelete(null);
      await fetchUserData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete holding.');
    } finally {
      setDeletingHolding(false);
    }
  };

  const handleApproveDeposit = async (txId: string) => {
    if (window.confirm('Approve this deposit request? User holding balance will be credited.')) {
      setActioningTxId(txId);
      try {
        await adminService.approveDeposit(txId);
        await fetchUserData();
      } catch (err: any) {
        alert(err.message || 'Deposit approval failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  const handleDeclineDeposit = async (txId: string) => {
    if (window.confirm('Decline this deposit request? The status will update to declined.')) {
      setActioningTxId(txId);
      try {
        await adminService.declineDeposit(txId);
        await fetchUserData();
      } catch (err: any) {
        alert(err.message || 'Deposit decline failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  const handleApproveWithdrawal = async (txId: string) => {
    if (window.confirm('Approve this withdrawal request? User holding balance will be debited.')) {
      setActioningTxId(txId);
      try {
        await adminService.approveWithdrawal(txId);
        await fetchUserData();
      } catch (err: any) {
        alert(err.message || 'Withdrawal approval failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  const handleDeclineWithdrawal = async (txId: string) => {
    if (window.confirm('Decline this withdrawal request? The status will update to declined.')) {
      setActioningTxId(txId);
      try {
        await adminService.declineWithdrawal(txId);
        await fetchUserData();
      } catch (err: any) {
        alert(err.message || 'Withdrawal decline failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  // Render variables
  const userDeposits = transactions.filter((tx) => tx.type === 'deposit');
  const userWithdrawals = transactions.filter((tx) => tx.type === 'withdrawal');
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const selectedAssetPrice = selectedAsset ? prices[selectedAsset.ticker] || 0 : 0;
  const parsedCreditQuantity = Number(creditQuantity);
  const impliedCreditValue =
    Number.isFinite(parsedCreditQuantity) && parsedCreditQuantity > 0 && selectedAssetPrice > 0
      ? parsedCreditQuantity * selectedAssetPrice
      : 0;
  const holdingValue = (holding: Holding) => holding.quantity * (prices[holding.ticker] || 0);
  const totalBalance = holdings.reduce((sum, holding) => sum + holdingValue(holding), 0);
  const stockBalance = holdings
    .filter((holding) => holding.type === 'stock')
    .reduce((sum, holding) => sum + holdingValue(holding), 0);
  const cryptoBalance = holdings
    .filter((holding) => holding.type === 'crypto')
    .reduce((sum, holding) => sum + holdingValue(holding), 0);
  const missingPriceHoldings = holdings.filter((holding) => !(prices[holding.ticker] > 0));

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4 text-center items-center justify-center py-12">
        <ShieldAlert className="w-10 h-10 text-danger" />
        <h2 className="text-sm font-extrabold uppercase text-textPrimary tracking-widest">Client Record Not Found</h2>
        <p className="text-[10px] text-textSecondary uppercase tracking-wider max-w-xs leading-relaxed">
          The requested user identification code does not map to any active node profile.
        </p>
        <Button variant="secondary" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Users
        </Button>
      </div>
    );
  }

  const regDate = profile.createdAt instanceof Date ? profile.createdAt : (profile.createdAt as any)?.toDate?.() || new Date();

  // Define columns types explicitly
  const holdingsColumns: Column<Holding>[] = [
    {
      header: 'Asset Name',
      key: 'assetName',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-textPrimary">{row.assetName}</span>
          <span className="text-[10px] text-textSecondary uppercase font-mono">({row.ticker})</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (row) => (
        <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase">
          {row.type}
        </Badge>
      ),
    },
    {
      header: 'Total Quantity',
      key: 'quantity',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-goldAccent">
          {row.quantity.toFixed(row.type === 'crypto' ? 6 : 4)}
        </span>
      ),
    },
    {
      header: 'Live Price',
      key: 'price',
      render: (row) => prices[row.ticker] > 0 ? (
        <span className="font-mono text-xs text-textPrimary">
          ${prices[row.ticker].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
        </span>
      ) : (
        <span className="text-[9px] font-bold uppercase tracking-wider text-danger">Unavailable</span>
      ),
    },
    {
      header: 'Estimated Value',
      key: 'value',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-textPrimary">
          ${holdingValue(row).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        <Button
          variant="secondary"
          className="p-1 h-7 w-7 border-danger/30 text-danger hover:bg-danger/10"
          onClick={() => setHoldingToDelete(row)}
          aria-label={`Delete ${row.ticker} holding`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  const depositColumns: Column<Transaction>[] = [
    {
      header: 'Asset details',
      key: 'ticker',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-textPrimary">{row.quantity.toFixed(4)} {row.ticker}</span>
          <span className="text-[9px] text-textSecondary block font-mono mt-0.5">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge
          variant={row.status === 'completed' ? 'success' : row.status === 'declined' ? 'error' : 'neutral'}
          className="text-[8px] font-extrabold tracking-widest uppercase"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Action / Audit',
      key: 'action',
      render: (row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                className="p-1 h-7 w-7 bg-success/15 border-success/30 hover:bg-success/25 text-success flex items-center justify-center rounded-btn"
                disabled={actioningTxId !== null}
                onClick={() => handleApproveDeposit(row.id)}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="secondary"
                className="p-1 h-7 w-7 bg-danger/15 border-danger/30 hover:bg-danger/25 text-danger flex items-center justify-center rounded-btn"
                disabled={actioningTxId !== null}
                onClick={() => handleDeclineDeposit(row.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        }
        const dt = row.createdAt instanceof Date ? row.createdAt : (row.createdAt as any)?.toDate?.() || new Date();
        return <span className="text-[9px] text-textSecondary font-mono">{dt.toLocaleDateString()}</span>;
      },
    },
  ];

  const withdrawalColumns: Column<Transaction>[] = [
    {
      header: 'Asset details',
      key: 'ticker',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-textPrimary">{row.quantity.toFixed(4)} {row.ticker}</span>
          <span className="text-[9px] text-textSecondary block font-mono mt-0.5">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge
          variant={row.status === 'completed' ? 'success' : row.status === 'declined' ? 'error' : 'neutral'}
          className="text-[8px] font-extrabold tracking-widest uppercase"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Action / Audit',
      key: 'action',
      render: (row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                className="p-1 h-7 w-7 bg-success/15 border-success/30 hover:bg-success/25 text-success flex items-center justify-center rounded-btn"
                disabled={actioningTxId !== null}
                onClick={() => handleApproveWithdrawal(row.id)}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="secondary"
                className="p-1 h-7 w-7 bg-danger/15 border-danger/30 hover:bg-danger/25 text-danger flex items-center justify-center rounded-btn"
                disabled={actioningTxId !== null}
                onClick={() => handleDeclineWithdrawal(row.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        }
        const dt = row.createdAt instanceof Date ? row.createdAt : (row.createdAt as any)?.toDate?.() || new Date();
        return <span className="text-[9px] text-textSecondary font-mono">{dt.toLocaleDateString()}</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          className="text-[9px] font-extrabold uppercase tracking-widest px-3 min-h-[32px] h-8 border-borderCustom hover:border-goldAccent text-textSecondary hover:text-goldAccent flex items-center gap-1"
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Client Management File</h1>
          <span className="text-[10px] text-textSecondary font-mono uppercase tracking-wider block mt-0.5">UID: {userId}</span>
        </div>
      </div>

      {/* Profile & Freeze Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card (5 cols) */}
        <div className="lg:col-span-5 flex">
          <Card className="flex-1 bg-surface border border-borderCustom p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 pb-4 border-b border-borderCustom mb-6">
                <div className="h-12 w-12 rounded-full bg-goldAccent/10 border border-goldAccent/30 text-goldAccent flex items-center justify-center font-black text-sm uppercase">
                  {profile.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wide">{profile.name}</h3>
                  <p className="text-[10px] text-textSecondary font-mono mt-0.5">{profile.email}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[8px] text-textSecondary uppercase tracking-widest block font-bold">Account Access Level</span>
                  <span className="text-xs font-semibold text-textPrimary block mt-1">
                    <Badge variant={profile.role === 'admin' ? 'success' : 'neutral'} className="text-[9px] font-extrabold uppercase tracking-wider">
                      {profile.role === 'admin' ? 'ADMINISTRATOR' : 'STANDARD TRADER'}
                    </Badge>
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-textSecondary uppercase tracking-widest block font-bold">Client Registration Node</span>
                  <span className="text-xs font-semibold font-mono text-textPrimary block mt-1">
                    {regDate.toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="text-[8px] text-textSecondary uppercase tracking-widest block font-bold mb-1.5">
                    Account Tier
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTier}
                      onChange={(event) => setSelectedTier(event.target.value as UserTier)}
                      className="min-h-[36px] h-9 flex-1 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-bold focus:outline-none focus:border-goldAccent"
                    >
                      <option value="T1">T1</option>
                      <option value="T2">T2</option>
                      <option value="T3">T3</option>
                    </select>
                    <Button
                      variant="secondary"
                      className="min-h-[36px] h-9 px-3 text-[9px] font-extrabold uppercase tracking-wider"
                      onClick={handleUpdateTier}
                      disabled={savingTier || selectedTier === profile.tier}
                    >
                      {savingTier ? 'Saving...' : 'Save Tier'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Withdrawal Freeze Controls (7 cols) */}
        <div className="lg:col-span-7 flex">
          <Card className="flex-1 bg-surface border border-borderCustom p-6 flex flex-col justify-between">
            <form onSubmit={handleUpdateFreeze} className="flex flex-col h-full justify-between gap-6">
              <div>
                <h3 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-goldAccent" /> Withdrawal Security Controls
                </h3>
                <p className="text-[10px] text-textSecondary uppercase tracking-wider leading-relaxed mb-4">
                  Freeze standard user withdrawals to prevent assets leaving the platform. Standard transactions will block at submission.
                </p>

                <div className="flex flex-col gap-4">
                  {/* Freeze State Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFrozen}
                      onChange={(e) => setIsFrozen(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-borderCustom text-goldAccent bg-bgMain focus:ring-goldAccent focus:ring-offset-bgMain"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">Freeze Withdrawals</span>
                      {isFrozen ? (
                        <Badge variant="error" className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5">ACTIVE FREEZE</Badge>
                      ) : (
                        <Badge variant="success" className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5">STANDARD</Badge>
                      )}
                    </div>
                  </label>

                  {/* Reason Field */}
                  {isFrozen && (
                    <div className="flex flex-col gap-1.5 animate-fadeIn">
                      <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Freeze Rationale</label>
                      <input
                        type="text"
                        value={freezeReason}
                        onChange={(e) => setFreezeReason(e.target.value)}
                        placeholder="Enter official freeze explanation/rationale..."
                        required={isFrozen}
                        className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide transition-all focus:outline-none focus:border-goldAccent"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-borderCustom/60">
                <Button
                  type="submit"
                  variant="primary"
                  className="text-[9px] font-extrabold uppercase tracking-widest px-4.5 min-h-[36px] h-9"
                  disabled={savingFreeze}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Security Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Balance', value: totalBalance },
          { label: 'Stock Balance', value: stockBalance },
          { label: 'Crypto Balance', value: cryptoBalance },
        ].map((summary) => (
          <Card key={summary.label} className="bg-surface border border-borderCustom p-4">
            <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">{summary.label}</span>
            <span className="block mt-2 text-sm font-black font-mono text-textPrimary">
              ${summary.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </Card>
        ))}
        <Card className="bg-surface border border-borderCustom p-4">
          <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Holdings Count</span>
          <span className="block mt-2 text-sm font-black font-mono text-textPrimary">{holdings.length}</span>
        </Card>
      </div>

      {missingPriceHoldings.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-[8px] border border-goldAccent/30 bg-goldAccent/10 text-goldAccent">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
            Live prices are missing for {missingPriceHoldings.map((holding) => holding.ticker).join(', ')}.
            Balance totals exclude those holdings.
          </p>
        </div>
      )}

      {/* Holdings Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
            <Coins className="w-4 h-4 text-goldAccent" /> Account Ledger Holdings
          </h2>
          <Button
            variant="primary"
            className="text-[9px] font-extrabold uppercase tracking-widest px-3.5 min-h-[32px] h-8 flex items-center gap-1.5"
            onClick={() => setIsCreditModalOpen(true)}
          >
            <Plus className="w-4.5 h-4.5" /> Grant Admin Credit
          </Button>
        </div>

        <Table
          data={holdings}
          columns={holdingsColumns}
          emptyState={
            <div className="p-6 text-center text-textSecondary text-xs">
              This client does not currently hold any assets.
            </div>
          }
        />
      </div>

      {/* Transactions Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Deposits List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-goldAccent" /> Deposit Requests
          </h2>
          
          <Table
            data={userDeposits.map((d) => ({ ...d, id: d.id }))}
            columns={depositColumns}
            emptyState={
              <div className="p-6 text-center text-textSecondary text-xs">
                No deposit history found.
              </div>
            }
          />
        </div>

        {/* Withdrawals List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-goldAccent" /> Withdrawal Requests
          </h2>

          <Table
            data={userWithdrawals.map((w) => ({ ...w, id: w.id }))}
            columns={withdrawalColumns}
            emptyState={
              <div className="p-6 text-center text-textSecondary text-xs">
                No withdrawal history found.
              </div>
            }
          />
        </div>

      </div>

      {/* Grant Admin Credit Modal */}
      <Modal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        title="Execute Admin Credit Grant"
      >
        <form onSubmit={handleExecuteCredit} className="flex flex-col gap-4">
          <p className="text-[10px] text-textSecondary uppercase tracking-wider leading-relaxed">
            Adds quantity directly to holdings. This is a transaction-free operation. An audit trail will be written to the secure <code className="text-goldAccent font-mono">adminCredits</code> ledger, keeping the user's regular transaction list unmodified.
          </p>

          {/* Select Asset */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Select Target Asset</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full min-h-[44px] h-11 px-3.5 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent focus:shadow-[0_0_10px_rgba(201,168,76,0.05)]"
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.ticker}) - {asset.type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Credit Quantity (Units)</label>
            <input
              type="number"
              step="any"
              value={creditQuantity}
              onChange={(e) => setCreditQuantity(e.target.value)}
              placeholder="e.g. 0.057"
              required
              className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide transition-all focus:outline-none focus:border-goldAccent"
            />
          </div>

          {/* Amount USD */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Implied USD Valuation</label>
            <div className={`w-full min-h-[44px] px-4 rounded-[8px] bg-bgMain border flex items-center font-mono text-xs font-bold ${
              selectedAssetPrice > 0 ? 'border-borderCustom text-textPrimary' : 'border-danger/40 text-danger'
            }`}>
              {selectedAssetPrice > 0 ? (
                <span>
                  ${impliedCreditValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-textSecondary font-normal ml-2">
                    @ ${selectedAssetPrice.toLocaleString(undefined, { maximumFractionDigits: 8 })} / {selectedAsset?.ticker}
                  </span>
                </span>
              ) : (
                'Live price unavailable'
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCustom">
            <Button
              type="button"
              variant="secondary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-4 min-h-[38px] h-9 border-borderCustom"
              onClick={() => setIsCreditModalOpen(false)}
              disabled={savingCredit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-5.5 min-h-[38px] h-9"
              disabled={
                savingCredit
                || selectedAssetPrice <= 0
                || !Number.isFinite(parsedCreditQuantity)
                || parsedCreditQuantity <= 0
              }
            >
              {savingCredit ? 'Granting...' : 'Grant Admin Credit'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(holdingToDelete)}
        onClose={() => !deletingHolding && setHoldingToDelete(null)}
        title="Delete Client Holding"
      >
        {holdingToDelete && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 p-3 rounded-[8px] border border-danger/30 bg-danger/5">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
              <p className="text-[10px] text-textSecondary uppercase tracking-wider leading-relaxed">
                This permanently removes the holding. No user transaction will be created; the action will be recorded in the secure admin audit ledger.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Asset', holdingToDelete.assetName],
                ['Ticker', holdingToDelete.ticker],
                ['Quantity', holdingToDelete.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })],
                [
                  'Estimated Value',
                  prices[holdingToDelete.ticker] > 0
                    ? `$${holdingValue(holdingToDelete).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'Live price unavailable',
                ],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-[8px] bg-bgMain border border-borderCustom">
                  <span className="block text-[8px] text-textSecondary font-bold uppercase tracking-widest">{label}</span>
                  <span className="block mt-1 text-xs text-textPrimary font-bold">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-borderCustom">
              <Button
                variant="secondary"
                onClick={() => setHoldingToDelete(null)}
                disabled={deletingHolding}
                className="text-[9px] font-extrabold uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleDeleteHolding}
                disabled={deletingHolding || !holdingToDelete.id}
                className="text-[9px] font-extrabold uppercase tracking-widest border-danger/40 text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deletingHolding ? 'Deleting...' : 'Delete Holding'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUserDetailPage;
