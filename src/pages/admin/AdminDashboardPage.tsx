/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminService } from '../../services/adminService';
import type { User, Transaction } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import {
  Users,
  ArrowDownLeft,
  Coins,
  MessageSquare,
  ArrowRight,
  Check,
  X,
  Clock
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Transaction[]>([]);
  const [totalAssetsCount, setTotalAssetsCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actioningTxId, setActioningTxId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all users
      const allUsers = await adminService.getAllUsers();
      setUsers(allUsers);

      // 2. Fetch all transactions to filter pending deposits
      const allTransactions = await adminService.getAllTransactions();
      const pendingDeps = allTransactions.filter(
        (tx) => tx.type === 'deposit' && tx.status === 'pending'
      );
      setPendingDeposits(pendingDeps);

      // 3. Fetch assets count
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      setTotalAssetsCount(assetsSnapshot.size);

      // 4. Fetch open support tickets (unread by admin)
      const ticketsQuery = query(
        collection(db, 'supportChats'),
        where('unreadByAdmin', '==', true)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      setOpenTicketsCount(ticketsSnapshot.size);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async (txId: string) => {
    if (window.confirm('Are you sure you want to APPROVE this deposit? This will credit the user\'s holdings.')) {
      setActioningTxId(txId);
      try {
        await adminService.approveDeposit(txId);
        await fetchDashboardData();
      } catch (err: any) {
        alert(err.message || 'Approval failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  const handleDecline = async (txId: string) => {
    if (window.confirm('Are you sure you want to DECLINE this deposit?')) {
      setActioningTxId(txId);
      try {
        await adminService.declineDeposit(txId);
        await fetchDashboardData();
      } catch (err: any) {
        alert(err.message || 'Decline failed.');
      } finally {
        setActioningTxId(null);
      }
    }
  };

  // UI calculations
  const stats = [
    {
      title: 'Total Registered Users',
      value: users.length,
      icon: Users,
      color: 'text-goldAccent bg-goldAccent/10 border-goldAccent/20',
      link: '/admin/users'
    },
    {
      title: 'Pending Deposits',
      value: pendingDeposits.length,
      icon: ArrowDownLeft,
      color: pendingDeposits.length > 0 ? 'text-danger bg-danger/10 border-danger/20' : 'text-success bg-success/10 border-success/20',
      link: '/admin/transactions'
    },
    {
      title: 'Active Asset List',
      value: totalAssetsCount,
      icon: Coins,
      color: 'text-goldAccent bg-goldAccent/10 border-goldAccent/20',
      link: '/admin/investments'
    },
    {
      title: 'Open Support Tickets',
      value: openTicketsCount,
      icon: MessageSquare,
      color: openTicketsCount > 0 ? 'text-danger bg-danger/10 border-danger/20' : 'text-textSecondary bg-borderCustom/40 border-borderCustom/60',
      link: '/admin/support'
    }
  ];

  // Get last 5 registered users
  const recentUsers = [...users]
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  // Get last 5 pending deposits
  const recentPendingDeposits = pendingDeposits.slice(0, 5);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Operational Dashboard</h1>
        <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Real-time system health and administration node</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              onClick={() => navigate(stat.link)}
              className="glow-card cursor-pointer flex items-center justify-between p-5 bg-surface border border-borderCustom rounded-card transition-all"
            >
              <div>
                <span className="text-[9px] text-textSecondary uppercase tracking-widest font-bold block mb-1">
                  {stat.title}
                </span>
                <span className="text-2xl font-black text-textPrimary font-mono">
                  {stat.value}
                </span>
              </div>
              <div className={`h-11 w-11 rounded-lg border flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Deposit Shortcuts Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-goldAccent" /> Action Required: Deposit Requests
            </h2>
            <Button
              variant="secondary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-3 min-h-[28px] h-7 border-borderCustom"
              onClick={() => navigate('/admin/transactions')}
            >
              All Logs <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <Card className="bg-surface border border-borderCustom p-0 overflow-hidden">
            {recentPendingDeposits.length === 0 ? (
              <div className="p-8 text-center text-textSecondary flex flex-col items-center justify-center">
                <div className="h-10 w-10 rounded-full border border-borderCustom bg-borderCustom/20 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <h3 className="text-xs font-bold uppercase text-textPrimary tracking-wider">Zero Pending Queue</h3>
                <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">All deposits have been successfully processed.</p>
              </div>
            ) : (
              <div className="divide-y divide-borderCustom/60">
                {recentPendingDeposits.map((tx) => {
                  const txDate = tx.createdAt instanceof Date ? tx.createdAt : (tx.createdAt as any)?.toDate?.() || new Date();
                  const txUser = users.find((u) => u.uid === tx.userId);
                  return (
                    <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bgMain/20 hover:bg-bgMain/40 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-textPrimary uppercase tracking-wider">{txUser?.name || 'Unknown User'}</span>
                          <span className="text-[9px] text-textSecondary tracking-wider">({txUser?.email})</span>
                        </div>
                        <div className="text-[10px] text-textSecondary font-mono mt-1">
                          Deposit: <span className="text-goldAccent font-semibold">{tx.quantity.toFixed(4)} {tx.ticker}</span> (${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </div>
                        <div className="text-[8px] text-textSecondary/70 font-mono mt-0.5">
                          Requested: {txDate.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="secondary"
                          className="text-[9px] font-extrabold uppercase tracking-widest bg-success/10 border-success/30 hover:bg-success/20 text-success min-h-[30px] h-8 px-3.5"
                          disabled={actioningTxId !== null}
                          onClick={() => handleApprove(tx.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-[9px] font-extrabold uppercase tracking-widest bg-danger/10 border-danger/30 hover:bg-danger/20 text-danger min-h-[30px] h-8 px-3.5"
                          disabled={actioningTxId !== null}
                          onClick={() => handleDecline(tx.id)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Registered Users (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-goldAccent" /> Recent Registered Users
            </h2>
            <Button
              variant="secondary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-3 min-h-[28px] h-7 border-borderCustom"
              onClick={() => navigate('/admin/users')}
            >
              All Users <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <Card className="bg-surface border border-borderCustom p-0 overflow-hidden">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-textSecondary">
                No users found.
              </div>
            ) : (
              <div className="divide-y divide-borderCustom/60">
                {recentUsers.map((u) => {
                  const regDate = u.createdAt instanceof Date ? u.createdAt : (u.createdAt as any)?.toDate?.() || new Date();
                  return (
                    <div
                      key={u.uid}
                      onClick={() => navigate(`/admin/users/${u.uid}`)}
                      className="p-4 flex items-center justify-between gap-3 bg-bgMain/20 hover:bg-bgMain/40 transition-colors cursor-pointer select-none"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-textPrimary block truncate">{u.name}</span>
                        <span className="text-[9px] text-textSecondary block truncate font-mono mt-0.5">{u.email}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[8px] text-textSecondary/70 block font-mono">Registered</span>
                        <span className="text-[9px] text-textSecondary font-mono block mt-0.5">{regDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboardPage;
