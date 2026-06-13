import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { supportService } from '../../services/supportService';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MapPin,
  MessageSquare,
  History,
  LogOut,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Settings
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const unsub = supportService.onSupportChatsChange((chats) => {
      const unreadCount = chats.filter((c) => c.unreadByAdmin).length;
      setUnreadSupportCount(unreadCount);
    });
    return () => unsub();
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  const navItems = [
    { path: '/admin', name: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/users', name: 'Users', icon: Users, exact: false },
    { path: '/admin/investments', name: 'Asset Management', icon: TrendingUp, exact: false },
    { path: '/admin/deposits', name: 'Deposit Approvals', icon: ArrowDownLeft, exact: false },
    { path: '/admin/withdrawals', name: 'Withdrawal Approvals', icon: ArrowUpRight, exact: false },
    { path: '/admin/deposit-addresses', name: 'Addresses', icon: MapPin, exact: false },
    { path: '/admin/transactions', name: 'Transaction Management', icon: History, exact: false },
    { path: '/admin/support', name: 'Support Management', icon: MessageSquare, exact: false },
    { path: '/admin/settings', name: 'Platform Settings', icon: Settings, exact: false },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path) && location.pathname !== '/admin';
  };

  return (
    <div className="min-h-screen bg-bgMain text-textPrimary flex flex-col">

      {/* ══════════════════════════════════════════
          MOBILE TOP BAR (< md only)
      ══════════════════════════════════════════ */}
      <div className="md:hidden sticky top-0 z-40 bg-surface border-b border-borderCustom flex items-center justify-between px-4 h-14">
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="flex flex-col justify-center items-center gap-[5px] w-10 h-10 cursor-pointer group"
        >
          <span className="block h-[2px] w-5 bg-textSecondary group-hover:bg-goldAccent transition-colors rounded-full" />
          <span className="block h-[2px] w-5 bg-textSecondary group-hover:bg-goldAccent transition-colors rounded-full" />
          <span className="block h-[2px] w-5 bg-textSecondary group-hover:bg-goldAccent transition-colors rounded-full" />
        </button>

        {/* Centred brand */}
        <div className="cursor-pointer select-none absolute left-1/2 -translate-x-1/2" onClick={() => navigate('/admin')}>
          <BrandLogo size="sm" showText={true} />
        </div>

        {/* Right: unread badge */}
        <div className="w-10 flex items-center justify-end">
          {unreadSupportCount > 0 && (
            <span className="bg-danger text-bgMain text-[9px] font-black px-1.5 py-0.5 rounded-full select-none">
              {unreadSupportCount}
            </span>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE DRAWER BACKDROP
      ══════════════════════════════════════════ */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-bgMain/70 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ══════════════════════════════════════════
          MOBILE SLIDE-IN DRAWER
      ══════════════════════════════════════════ */}
      <aside className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 bg-surface border-r border-borderCustom flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="h-14 px-4 border-b border-borderCustom flex items-center justify-between shrink-0">
          <div className="cursor-pointer select-none" onClick={() => navigate('/admin')}>
            <BrandLogo size="sm" showText={true} subtext="ADMIN NODE" />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 flex items-center justify-center rounded-btn border border-borderCustom/60 text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-all cursor-pointer text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* Security notice */}
        <div className="px-4 py-3 border-b border-borderCustom/50 bg-danger/5 flex items-start gap-2 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
          <p className="text-[9px] text-danger font-semibold uppercase tracking-wider leading-relaxed">
            Clearance Level 3. Adjustments here impact user balances.
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={`flex items-center justify-between px-4 py-3 rounded-btn text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                  active
                    ? 'bg-goldAccent/10 border-goldAccent/30 text-goldAccent'
                    : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-goldAccent' : ''}`} />
                  {item.name}
                </div>
                {item.path === '/admin/support' && unreadSupportCount > 0 && (
                  <span className="bg-danger text-bgMain text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                    {unreadSupportCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-borderCustom bg-bgMain/20 shrink-0">
          <div className="px-1 mb-3">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-bold block">OPERATOR</span>
            <span className="text-xs font-bold text-textPrimary block truncate">{userProfile?.name || 'Administrator'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn border border-borderCustom hover:border-danger text-textSecondary hover:text-danger text-[10px] font-bold uppercase tracking-widest transition-all bg-surface cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          DESKTOP: sidebar + content
      ══════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col md:flex-row min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-surface border-r border-borderCustom flex-col shrink-0">
          <div className="p-6 border-b border-borderCustom">
            <div className="cursor-pointer select-none" onClick={() => navigate('/admin')}>
              <BrandLogo size="md" showText={true} subtext="ADMIN NODE" />
            </div>
          </div>

          <div className="px-6 py-4 border-b border-borderCustom/60 bg-danger/5 text-danger flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed font-semibold uppercase tracking-wider">
              Clearance Level 3. Transactions &amp; adjustments committed here impact user balances.
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={`flex items-center justify-between px-4 py-3 rounded-btn text-xs font-semibold uppercase tracking-wider transition-all duration-200 border relative ${
                    active
                      ? 'bg-goldAccent/10 border-goldAccent/30 text-goldAccent shadow-[0_0_15px_rgba(201,168,76,0.03)]'
                      : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-goldAccent' : ''}`} />
                    {item.name}
                  </div>
                  {item.path === '/admin/support' && unreadSupportCount > 0 && (
                    <span className="bg-danger text-bgMain text-[9px] font-black px-1.5 py-0.5 rounded-full select-none shrink-0">
                      {unreadSupportCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-borderCustom mt-auto bg-bgMain/20">
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="truncate">
                <span className="text-[9px] text-textSecondary uppercase tracking-widest block font-bold">OPERATOR</span>
                <span className="text-xs font-bold text-textPrimary block truncate">{userProfile?.name || 'Administrator'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn border border-borderCustom hover:border-goldAccent text-textSecondary hover:text-goldAccent text-[10px] font-bold uppercase tracking-widest transition-all bg-surface hover:shadow-[0_0_10px_rgba(201,168,76,0.05)] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-grow flex flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
