/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketMode } from '../contexts/MarketModeContext';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  User,
  Sliders,
  Lock,
  ShieldAlert,
  MessageSquare,
  Scale,
  Key,
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { currentMarketMode, setMarketMode } = useMarketMode();
  
  const [updatingMarket, setUpdatingMarket] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState(false);

  // Subscribe to user's support chat unread status
  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => setUnreadByUser(false));
      return;
    }
    const chatDocRef = doc(db, 'supportChats', user.uid);
    const unsub = onSnapshot(
      chatDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUnreadByUser(!!data.unreadByUser);
        } else {
          setUnreadByUser(false);
        }
      },
      (err) => {
        console.error('Error listening to support chat status in settings:', err);
      }
    );
    return () => unsub();
  }, [user]);

  const getJoinDate = () => {
    if (!userProfile?.createdAt) return 'N/A';
    const raw = userProfile.createdAt;
    const dateObj = (raw as any).toDate 
      ? (raw as any).toDate() 
      : new Date(raw as any);
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleMarketPreferenceChange = async (market: 'stock' | 'crypto') => {
    if (!user) return;
    setMarketMode(market);
    setUpdatingMarket(true);
    try {
      await userService.updateUserProfile(user.uid, {
        preferredMarket: market
      });
    } catch (err) {
      console.error('Error saving market preference:', err);
    } finally {
      setUpdatingMarket(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetError(null);
    setResetSent(false);

    try {
      await authService.resetPassword(user.email);
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setResetError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight uppercase">
          Settings & Profile
        </h1>
        <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
          Configure security credentials and trading environment preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile & Account Status */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* PROFILE SECTION */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center gap-3 border-b border-borderCustom/40 pb-4 mb-5">
              <User className="w-5 h-5 text-goldAccent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Profile Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Full Name</label>
                <div className="px-4 py-3 bg-bgMain rounded-[6px] border border-borderCustom/60 text-xs font-semibold text-textPrimary">
                  {userProfile?.name || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Email Address</label>
                <div className="px-4 py-3 bg-bgMain rounded-[6px] border border-borderCustom/60 text-xs font-mono font-semibold text-textPrimary">
                  {userProfile?.email || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Vantage UID</label>
                <div className="px-4 py-3 bg-bgMain rounded-[6px] border border-borderCustom/60 text-[10px] font-mono text-textSecondary select-all">
                  {userProfile?.uid || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Join Date</label>
                <div className="px-4 py-3 bg-bgMain rounded-[6px] border border-borderCustom/60 text-xs font-semibold text-textPrimary">
                  {getJoinDate()}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Account Tier</label>
                <div className="px-4 py-3 bg-bgMain rounded-[6px] border border-borderCustom/60 text-xs font-extrabold text-goldAccent">
                  {userProfile?.tier || 'T1'}
                </div>
              </div>
            </div>
          </Card>

          {/* PREFERENCES SECTION */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center gap-3 border-b border-borderCustom/40 pb-4 mb-5">
              <Sliders className="w-5 h-5 text-goldAccent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Preferences</h2>
            </div>

            <p className="text-xs text-textSecondary font-medium leading-relaxed mb-5">
              Choose the asset class you want the platform to focus on by default when you log in. You can still toggle between them anytime on the main trading floor dashboard.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => !updatingMarket && handleMarketPreferenceChange('stock')}
                className={`cursor-pointer p-4 rounded-[8px] border transition-all duration-300 flex items-center justify-between ${
                  currentMarketMode === 'stock'
                    ? 'border-goldAccent bg-goldAccent/5 text-goldAccent'
                    : 'border-borderCustom hover:border-textSecondary bg-bgMain/40 text-textSecondary hover:text-textPrimary'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">STOCKS</h4>
                  <p className="text-[10px] text-textSecondary mt-0.5 font-medium">Equities & Public Shares focus</p>
                </div>
                {currentMarketMode === 'stock' && (
                  <span className="h-2 w-2 rounded-full bg-goldAccent shadow-[0_0_8px_#C9A84C]" />
                )}
              </div>

              <div
                onClick={() => !updatingMarket && handleMarketPreferenceChange('crypto')}
                className={`cursor-pointer p-4 rounded-[8px] border transition-all duration-300 flex items-center justify-between ${
                  currentMarketMode === 'crypto'
                    ? 'border-goldAccent bg-goldAccent/5 text-goldAccent'
                    : 'border-borderCustom hover:border-textSecondary bg-bgMain/40 text-textSecondary hover:text-textPrimary'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">CRYPTO</h4>
                  <p className="text-[10px] text-textSecondary mt-0.5 font-medium">Digital Currency & Tokens focus</p>
                </div>
                {currentMarketMode === 'crypto' && (
                  <span className="h-2 w-2 rounded-full bg-goldAccent shadow-[0_0_8px_#C9A84C]" />
                )}
              </div>
            </div>
          </Card>

          {/* SECURITY ACTIONS */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center gap-3 border-b border-borderCustom/40 pb-4 mb-5">
              <Lock className="w-5 h-5 text-goldAccent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Security Node</h2>
            </div>

            <p className="text-xs text-textSecondary font-medium leading-relaxed mb-6">
              Keep your trading credentials safe. If you suspect any unauthorized access, reset your password immediately or reach out to support.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                variant="secondary"
                onClick={handlePasswordReset}
                isLoading={resetLoading}
                className="text-xs font-bold uppercase tracking-wider border border-borderCustom h-11 min-h-[44px]"
              >
                <Key className="w-4 h-4 mr-2" /> Request Password Reset
              </Button>

              <Button
                variant="danger"
                onClick={handleLogout}
                className="text-xs font-bold uppercase tracking-wider h-11 min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-2" /> End Working Session
              </Button>
            </div>

            {resetSent && (
              <div className="mt-4 p-3 rounded-[8px] bg-success/10 border border-success/20 text-xs font-semibold text-success tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Password reset email dispatched to {userProfile?.email} successfully.</span>
              </div>
            )}

            {resetError && (
              <div className="mt-4 p-3 rounded-[8px] bg-danger/10 border border-danger/20 text-xs font-semibold text-danger tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Error: {resetError}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Account Status & Help / Support Shortcuts */}
        <div className="flex flex-col gap-6">
          {/* ACCOUNT INTEGRITY STATUS */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center gap-3 border-b border-borderCustom/40 pb-4 mb-5">
              <ShieldAlert className="w-5 h-5 text-goldAccent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Integrity Status</h2>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] text-textSecondary font-bold uppercase tracking-wider block mb-1">Withdrawal Gateway</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest ${
                  userProfile?.withdrawalFrozen
                    ? 'bg-danger/10 border border-danger/20 text-danger'
                    : 'bg-success/10 border border-success/20 text-success'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${userProfile?.withdrawalFrozen ? 'bg-danger' : 'bg-success'}`} />
                  {userProfile?.withdrawalFrozen ? 'Locked / Frozen' : 'Active / Operational'}
                </span>
              </div>

              {userProfile?.withdrawalFrozen && (
                <div className="p-3 bg-danger/5 border border-danger/15 rounded-[6px] text-xs font-medium text-danger leading-relaxed">
                  <span className="font-bold block uppercase tracking-wider text-[9px] mb-1">Reason for Hold:</span>
                  {userProfile.freezeReason || 'Your account withdrawal permissions have been temporarily locked by administrative guidelines. Please contact support node.'}
                </div>
              )}
            </div>
          </Card>

          {/* HELP & SUPPORT */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center justify-between border-b border-borderCustom/40 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-goldAccent" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Support Hub</h2>
              </div>
              {unreadByUser && (
                <span className="px-2.5 py-0.5 rounded-[4px] bg-danger text-bgMain text-[8px] font-extrabold uppercase tracking-widest animate-pulse">
                  Unread
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-textSecondary font-medium leading-relaxed mb-5">
              Access real-time encrypted operational support chat loops for troubleshooting with vantage administrators.
            </p>

            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center justify-between p-3.5 rounded-[8px] bg-bgMain hover:bg-borderCustom/30 border border-borderCustom hover:border-goldAccent text-xs font-bold text-textPrimary uppercase tracking-wider transition-all"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-goldAccent" />
                Connect to Desk
              </span>
              <ChevronRight className="w-4 h-4 text-textSecondary" />
            </button>
          </Card>

          {/* LEGAL & POLICY */}
          <Card variant="standard" className="border border-borderCustom/60">
            <div className="flex items-center gap-3 border-b border-borderCustom/40 pb-4 mb-4">
              <Scale className="w-5 h-5 text-goldAccent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-textPrimary">Legal Framework</h2>
            </div>

            <div className="flex flex-col gap-2.5">
              <button className="flex items-center justify-between text-left text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors py-1 cursor-pointer">
                <span>Terms of Service</span>
                <ChevronRight className="w-3.5 h-3.5 text-borderCustom" />
              </button>
              <button className="flex items-center justify-between text-left text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors py-1 cursor-pointer">
                <span>Privacy & Cookies policy</span>
                <ChevronRight className="w-3.5 h-3.5 text-borderCustom" />
              </button>
              <button className="flex items-center justify-between text-left text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors py-1 cursor-pointer">
                <span>Vantage Risk Disclosure</span>
                <ChevronRight className="w-3.5 h-3.5 text-borderCustom" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
