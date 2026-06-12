/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminService } from '../../services/adminService';
import type { User, AdminCredit } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Search, ShieldAlert, ArrowDownLeft, ArrowUpRight, PlusCircle } from 'lucide-react';

interface CombinedRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'deposit' | 'withdrawal' | 'admin_credit';
  ticker: string;
  quantity: number;
  amount: number;
  status: 'pending' | 'completed' | 'declined';
  createdAt: Date;
  description: string;
}

export const AdminTransactionsPage: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CombinedRecord[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filter form states
  const [userQuery, setUserQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'admin_credit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'declined'>('all');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  const loadAuditTrail = async () => {
    try {
      setLoading(true);

      // 1. Load users for mapping IDs
      const users = await adminService.getAllUsers();
      const usersMap: Record<string, User> = {};
      users.forEach((u) => {
        usersMap[u.uid] = u;
      });

      // 2. Load standard transactions
      const txs = await adminService.getAllTransactions();

      // 3. Load admin credits
      const creditsSnapshot = await getDocs(collection(db, 'adminCredits'));
      const credits = creditsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AdminCredit[];

      // 4. Combine and map to standard record view
      const combined: CombinedRecord[] = [];

      txs.forEach((tx) => {
        const u = usersMap[tx.userId];
        const date = tx.createdAt instanceof Date ? tx.createdAt : (tx.createdAt as any)?.toDate?.() || new Date();
        combined.push({
          id: tx.id,
          userId: tx.userId,
          userName: u?.name || 'Unknown User',
          userEmail: u?.email || 'unknown@vantage.com',
          type: tx.type as 'deposit' | 'withdrawal',
          ticker: tx.ticker,
          quantity: tx.quantity,
          amount: tx.amount,
          status: tx.status,
          createdAt: date,
          description: `${tx.type.toUpperCase()} request`,
        });
      });

      credits.forEach((ac) => {
        const u = usersMap[ac.userId];
        const date = ac.createdAt instanceof Date ? ac.createdAt : (ac.createdAt as any)?.toDate?.() || new Date();
        combined.push({
          id: ac.id,
          userId: ac.userId,
          userName: u?.name || 'Unknown User',
          userEmail: u?.email || 'unknown@vantage.com',
          type: 'admin_credit',
          ticker: ac.ticker,
          quantity: ac.quantityAdded,
          amount: ac.amountAdded,
          status: 'completed', // Admin credits are always completed
          createdAt: date,
          description: `Admin Credit (Valued at $${ac.priceAtTime.toFixed(2)}/unit)`,
        });
      });

      // Sort combined array by createdAt descending
      combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setRecords(combined);
    } catch (err) {
      console.error('Error loading audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
  }, []);

  useEffect(() => {
    if (location.pathname.endsWith('/deposits')) {
      setTypeFilter('deposit');
      setStatusFilter('pending');
    } else if (location.pathname.endsWith('/withdrawals')) {
      setTypeFilter('withdrawal');
      setStatusFilter('pending');
    } else {
      setTypeFilter('all');
      setStatusFilter('all');
    }
  }, [location.pathname]);

  const handleDecision = async (record: CombinedRecord, approve: boolean) => {
    if (record.type === 'admin_credit' || record.status !== 'pending') return;
    setActioningId(record.id);
    try {
      if (record.type === 'deposit') {
        await (approve
          ? adminService.approveDeposit(record.id)
          : adminService.declineDeposit(record.id));
      } else {
        await (approve
          ? adminService.approveWithdrawal(record.id)
          : adminService.declineWithdrawal(record.id));
      }
      await loadAuditTrail();
    } catch (error) {
      console.error('Error processing transaction decision:', error);
      alert(error instanceof Error ? error.message : 'Unable to process transaction.');
    } finally {
      setActioningId(null);
    }
  };

  // Compute filtered records inline during render (prevents react-hooks/set-state-in-effect error)
  const filteredRecords = useMemo(() => {
    let result = [...records];

    // User Query (Name, Email, UID)
    const uQ = userQuery.trim().toLowerCase();
    if (uQ) {
      result = result.filter(
        (r) =>
          r.userName.toLowerCase().includes(uQ) ||
          r.userEmail.toLowerCase().includes(uQ) ||
          r.userId.toLowerCase().includes(uQ)
      );
    }

    // Type Filter
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter);
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Date range start
    if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      result = result.filter((r) => r.createdAt >= start);
    }

    // Date range end
    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      result = result.filter((r) => r.createdAt <= end);
    }

    return result;
  }, [records, userQuery, typeFilter, statusFilter, startDateStr, endDateStr]);

  const columns = [
    {
      header: 'Date & Time',
      key: 'createdAt',
      render: (row: CombinedRecord) => (
        <span className="text-[10px] font-mono text-textSecondary uppercase tracking-wider block">
          {row.createdAt.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Client / User',
      key: 'userName',
      render: (row: CombinedRecord) => (
        <div>
          <span className="font-bold text-xs text-textPrimary block">{row.userName}</span>
          <span className="text-[9px] text-textSecondary font-mono block mt-0.5">{row.userEmail}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (row: CombinedRecord) => {
        if (row.type === 'deposit') {
          return (
            <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase flex items-center w-fit gap-1 bg-success/10 border-success/20 text-success">
              <ArrowDownLeft className="w-2.5 h-2.5" /> DEPOSIT
            </Badge>
          );
        } else if (row.type === 'withdrawal') {
          return (
            <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase flex items-center w-fit gap-1 bg-danger/10 border-danger/20 text-danger">
              <ArrowUpRight className="w-2.5 h-2.5" /> WITHDRAWAL
            </Badge>
          );
        } else {
          return (
            <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase flex items-center w-fit gap-1 bg-goldAccent/10 border-goldAccent/20 text-goldAccent">
              <PlusCircle className="w-2.5 h-2.5" /> ADMIN CREDIT
            </Badge>
          );
        }
      },
    },
    {
      header: 'Asset Value Details',
      key: 'amount',
      render: (row: CombinedRecord) => (
        <div>
          <span className="font-mono text-xs font-bold text-textPrimary block">
            {row.quantity.toFixed(4)} {row.ticker}
          </span>
          <span className="text-[9px] text-textSecondary font-mono block mt-0.5">
            ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (row: CombinedRecord) => (
        <span className="text-[10px] text-textSecondary font-medium leading-relaxed block max-w-[180px] truncate">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row: CombinedRecord) => (
        <Badge
          variant={row.status === 'completed' ? 'success' : row.status === 'declined' ? 'error' : 'neutral'}
          className="text-[8px] font-extrabold tracking-widest uppercase"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Management',
      key: 'management',
      render: (row: CombinedRecord) => row.status === 'pending' && row.type !== 'admin_credit' ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 min-h-[32px] px-3 text-[8px] font-extrabold uppercase text-success border-success/30"
            disabled={actioningId !== null}
            onClick={() => handleDecision(row, true)}
          >
            Approve
          </Button>
          <Button
            variant="secondary"
            className="h-8 min-h-[32px] px-3 text-[8px] font-extrabold uppercase text-danger border-danger/30"
            disabled={actioningId !== null}
            onClick={() => handleDecision(row, false)}
          >
            Decline
          </Button>
        </div>
      ) : (
        <span className="text-[9px] text-textSecondary uppercase">Processed</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Transaction Audit Logs</h1>
        <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Review unified logs representing deposits, withdrawals, and internal administrative credit modifications</p>
      </div>

      {/* Filter Headers block */}
      <Card className="bg-surface border border-borderCustom p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* User search */}
          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Search Client</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Name, email, or UID..."
                className="w-full min-h-[38px] h-9 pl-9 pr-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold focus:outline-none focus:border-goldAccent"
              />
            </div>
          </div>

          {/* Type filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold focus:outline-none focus:border-goldAccent"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="admin_credit">Admin Credits</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold focus:outline-none focus:border-goldAccent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {/* Date range start */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Date From</label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold focus:outline-none focus:border-goldAccent"
            />
          </div>

          {/* Date range end */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Date To</label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold focus:outline-none focus:border-goldAccent"
            />
          </div>

        </div>
      </Card>

      {/* Main Table view */}
      <Table
        columns={columns}
        data={filteredRecords}
        isLoading={loading}
        emptyState={
          <div className="p-8 text-center text-textSecondary flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-full border border-borderCustom bg-borderCustom/20 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5 text-goldAccent" />
            </div>
            <h3 className="text-xs font-bold uppercase text-textPrimary tracking-wider">No Records Found</h3>
            <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">No transaction fits the specified filter rules.</p>
          </div>
        }
      />
    </div>
  );
};

export default AdminTransactionsPage;
