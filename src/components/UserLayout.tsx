import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SupportChat } from '../types';
import {
  Home,
  Briefcase,
  ArrowDownLeft,
  History,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const formatRelativeTime = (date: Date | null): string => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

export const UserLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadByUser, setUnreadByUser] = useState(false);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);
  const [chatData, setChatData] = useState<SupportChat | null>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  // Subscribe to user's support chat unread status
  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setUnreadByUser(false);
        setChatData(null);
      });
      return;
    }
    const chatDocRef = doc(db, 'supportChats', user.uid);
    const unsub = onSnapshot(
      chatDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUnreadByUser(!!data.unreadByUser);
          setChatData({ id: snapshot.id, ...data } as SupportChat);
        } else {
          setUnreadByUser(false);
          setChatData(null);
        }
      },
      (err) => {
        console.error('Error listening to user support chat status:', err);
      }
    );
    return () => unsub();
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiDropdownOpen(false);
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
          <div className="cursor-pointer select-none" onClick={() => navigate('/dashboard')}>
            <BrandLogo size="md" showText={true} />
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-bold uppercase tracking-wider transition-all duration-200 border relative ${
                    active
                      ? 'bg-goldAccent/10 border-goldAccent/30 text-goldAccent shadow-[0_0_15px_rgba(201,168,76,0.03)]'
                      : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                  {item.path === '/settings' && unreadByUser && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger animate-pulse ring-1 ring-bgMain" />
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Right Side Icons & Profile Dropdown */}
          <div className="flex items-center gap-4">
            {/* Notification Center */}
            <div className="relative" ref={notiRef}>
              <button
                onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
                className="text-textSecondary hover:text-goldAccent transition-colors relative p-1 cursor-pointer focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadByUser && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger animate-pulse ring-2 ring-bgMain" />
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notiDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-surface border border-borderCustom rounded-btn shadow-2xl py-3 z-50 animate-fadeIn glassmorphism">
                  <div className="px-4 pb-2 border-b border-borderCustom/60 flex items-center justify-between">
                    <span className="text-[10px] text-textSecondary font-bold uppercase tracking-wider">Notifications</span>
                    {unreadByUser && (
                      <span className="text-[8px] font-bold text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-danger" /> New
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    {unreadByUser && chatData ? (
                      <div className="px-4 py-3 hover:bg-borderCustom/20 transition-colors flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-textPrimary">New Support Message</span>
                          <span className="text-[8px] text-textSecondary font-mono">
                            {formatRelativeTime(
                              chatData.lastMessageAt
                                ? typeof (chatData.lastMessageAt as unknown as { toDate: () => Date }).toDate === 'function'
                                  ? (chatData.lastMessageAt as unknown as { toDate: () => Date }).toDate()
                                  : (chatData.lastMessageAt as Date)
                                : null
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-textSecondary line-clamp-2 italic">
                          "{chatData.lastMessage || 'We have sent you a message.'}"
                        </p>
                        <button
                          onClick={() => {
                            setNotiDropdownOpen(false);
                            navigate('/support');
                          }}
                          className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-goldAccent hover:text-goldAccent/80 transition-colors flex items-center gap-1 self-start cursor-pointer"
                        >
                          Open Support &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-[10px] uppercase tracking-wider text-textSecondary select-none">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                        navigate('/support');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-borderCustom/40 transition-colors uppercase tracking-wider text-left cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-goldAccent" />
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-lg border-t border-borderCustom px-2 flex justify-between items-center z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-0.5 group select-none"
            >
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <Icon className={`w-[18px] h-[18px] transition-colors duration-200 ${active ? 'text-goldAccent' : 'text-textSecondary group-hover:text-textPrimary'}`} />
                  {item.path === '/settings' && unreadByUser && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-danger animate-pulse ring-1 ring-bgMain" />
                  )}
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-1 transition-colors duration-200 ${active ? 'text-goldAccent' : 'text-textSecondary group-hover:text-textPrimary'}`}>
                  {item.name}
                </span>
                {active && (
                  <span className="absolute -bottom-1.5 w-4 h-0.5 bg-goldAccent rounded-full shadow-[0_0_8px_#C9A84C]" />
                )}
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Floating Action Button (FAB) for Support */}
      <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40">
        <button
          onClick={() => navigate('/support')}
          className="relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-surface border border-goldAccent/30 hover:border-goldAccent text-goldAccent hover:text-goldAccent shadow-[0_0_20px_rgba(201,168,76,0.15)] hover:shadow-[0_0_25px_rgba(201,168,76,0.25)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
          title="Contact Support"
        >
          <MessageSquare className="w-5 h-5 md:w-6 h-6 transition-transform group-hover:rotate-6" />
          {unreadByUser && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-danger animate-pulse ring-2 ring-surface">
              <span className="h-1 w-1 rounded-full bg-bgMain" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default UserLayout;
