import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import {
  Home,
  Briefcase,
  ArrowDownLeft,
  History,
  Settings,
  Bell,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';

export const UserLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setDropdownOpen(false);
      await authService.logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { path: '/dashboard', name: 'Home', icon: Home },
    { path: '/portfolio', name: 'Portfolio', icon: Briefcase },
    { path: '/deposit', name: 'Invest', icon: ArrowDownLeft },
    { path: '/transactions', name: 'Activity', icon: History },
    { path: '/settings', name: 'Settings', icon: Settings },
  ];

  const userInitials = userProfile?.name
    ? userProfile.name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US';

  return (
    <div className="min-h-screen bg-bgMain text-textPrimary flex flex-col pb-20 md:pb-0">
      {/* Top Header */}
      <nav className="glassmorphism border-b border-borderCustom sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigate('/dashboard')}>
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-goldAccent text-bgMain font-extrabold text-lg border border-goldAccent/40 shadow-[0_0_15px_rgba(201,168,76,0.15)]">
              VM
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-textPrimary">VANTAGE</span>
              <span className="font-medium text-[9px] tracking-[0.25em] text-goldAccent block -mt-1 uppercase">MARKETS</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                    active
                      ? 'bg-goldAccent/10 border-goldAccent/30 text-goldAccent shadow-[0_0_15px_rgba(201,168,76,0.03)]'
                      : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>

          {/* Right Side Icons & Profile Dropdown */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="text-textSecondary hover:text-goldAccent transition-colors relative p-1 cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-goldAccent ring-2 ring-bgMain" />
            </button>

            {/* Profile Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-3 sm:pl-4 border-l border-borderCustom h-9 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-borderCustom text-goldAccent border border-borderCustom font-bold text-xs uppercase select-none">
                  {userInitials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-textPrimary leading-tight max-w-[100px] truncate">
                    {userProfile?.name?.split(' ')[0] || 'Trader'}
                  </div>
                  <div className="text-[9px] text-textSecondary tracking-wide mt-0.5 uppercase">Account</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-textSecondary transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Account Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-60 bg-surface border border-borderCustom rounded-btn shadow-2xl py-2 z-50 animate-fadeIn glassmorphism">
                  <div className="px-4 py-3 border-b border-borderCustom/60 bg-bgMain/20">
                    <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider">Account Node</p>
                    <p className="text-xs font-bold text-textPrimary truncate mt-0.5">{userProfile?.name || 'Trader'}</p>
                    <p className="text-[10px] text-textSecondary truncate mt-0.5 font-mono">{userProfile?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40 transition-colors uppercase tracking-wider text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-goldAccent" />
                      Profile Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/support');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40 transition-colors uppercase tracking-wider text-left cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-goldAccent" />
                      Contact Support
                    </button>

                  </div>

                  <div className="border-t border-borderCustom/60 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textSecondary hover:text-danger hover:bg-danger/5 transition-colors uppercase tracking-wider text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-textSecondary group-hover:text-danger" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Page Workspace Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10">
        <Outlet />
      </main>

      {/* Bottom Tab Navigation (Fixed at the bottom on mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-borderCustom px-4 py-2 flex justify-between items-center z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-1 group select-none"
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-colors duration-200 ${active ? 'text-goldAccent' : 'text-textSecondary group-hover:text-textPrimary'}`} />
                <span className={`text-[9px] font-extrabold uppercase tracking-widest mt-1.5 transition-colors duration-200 ${active ? 'text-goldAccent' : 'text-textSecondary group-hover:text-textPrimary'}`}>
                  {item.name}
                </span>
                {active && (
                  <span className="absolute -bottom-2 w-5 h-0.5 bg-goldAccent rounded-full shadow-[0_0_10px_#C9A84C]" />
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default UserLayout;
