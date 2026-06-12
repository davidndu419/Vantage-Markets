import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import type { User } from '../../types';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Search, ShieldAlert, Edit2, Lock, Unlock } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await adminService.getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error loading users list:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Compute filtered users list purely on render (prevents react-hooks/set-state-in-effect error)
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.uid.toLowerCase().includes(query)
    );
  }, [searchQuery, users]);

  // Helper to construct table rows with an 'id' property for the Table component
  const tableData = filteredUsers.map((u) => ({
    ...u,
    id: u.uid,
  }));

  const columns: Column<typeof tableData[0]>[] = [
    {
      header: 'User Profile',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-borderCustom/60 text-goldAccent font-extrabold text-[11px] border border-borderCustom">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-textPrimary font-bold text-xs">{row.name}</div>
            <div className="text-[10px] text-textSecondary font-mono mt-0.5">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Unique UID',
      key: 'uid',
      render: (row) => (
        <span className="text-[10px] font-mono text-textSecondary uppercase tracking-wider">{row.uid}</span>
      ),
    },
    {
      header: 'Authorization Level',
      key: 'role',
      render: (row) => {
        const isAdmin = row.role === 'admin';
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={isAdmin ? 'success' : 'neutral'} className="text-[9px] font-extrabold tracking-widest uppercase">
              {isAdmin ? 'ADMIN' : 'TRADER'}
            </Badge>
          </div>
        );
      },
    },
    {
      header: 'Withdrawal Access',
      key: 'withdrawalFrozen',
      render: (row) => {
        const isFrozen = row.withdrawalFrozen;
        return (
          <div className="flex items-center gap-1.5 select-none">
            {isFrozen ? (
              <Badge variant="error" className="text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Frozen
              </Badge>
            ) : (
              <Badge variant="success" className="text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1">
                <Unlock className="w-2.5 h-2.5" /> Active
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button
          variant="secondary"
          className="text-[9px] font-extrabold uppercase tracking-widest px-3 min-h-[30px] h-8 border-borderCustom hover:border-goldAccent hover:text-goldAccent flex items-center gap-1"
          onClick={() => navigate(`/admin/users/${row.uid}`)}
        >
          <Edit2 className="w-3.5 h-3.5" /> Manage Details
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">User Administration</h1>
          <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Review permissions, freeze withdrawal controls, and modify client ledger accounts</p>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="relative max-w-md w-full">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-textSecondary">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by client name, email address, or UID..."
          className="w-full min-h-[44px] h-11 pl-10 pr-4 rounded-[8px] bg-surface border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide transition-all focus:outline-none focus:border-goldAccent"
        />
      </div>

      {/* Main Table card */}
      <Table
        columns={columns}
        data={tableData}
        isLoading={loading}
        emptyState={
          <div className="p-8 text-center text-textSecondary flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-full border border-borderCustom bg-borderCustom/20 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5 text-goldAccent" />
            </div>
            <h3 className="text-xs font-bold uppercase text-textPrimary tracking-wider">No Clients Found</h3>
            <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">No registered user matches your query filter parameters.</p>
          </div>
        }
      />
    </div>
  );
};

export default AdminUsersPage;
