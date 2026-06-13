import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MarketModeProvider } from './contexts/MarketModeContext';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { AdminRoute } from './guards/AdminRoute';

// Components
import { UserLayout } from './components/UserLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { MarketSelectionPage } from './pages/MarketSelectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { DepositPage } from './pages/DepositPage';
import { DepositDetailsPage } from './pages/DepositDetailsPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SupportPage } from './pages/SupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminInvestmentsPage } from './pages/admin/AdminInvestmentsPage';
import { AdminDepositAddressesPage } from './pages/admin/AdminDepositAddressesPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <MarketModeProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Onboarding Route */}
            <Route
              path="/market-selection"
              element={
                <ProtectedRoute allowOnboardingPending={true}>
                  <MarketSelectionPage />
                </ProtectedRoute>
              }
            />

            {/* User Protected Routes wrapped in UserLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <UserLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="deposit" element={<DepositPage />} />
              <Route path="deposit/:assetId" element={<DepositDetailsPage />} />
              <Route path="withdraw" element={<WithdrawPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Admin Silently Protected Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId" element={<AdminUserDetailPage />} />
              <Route path="investments" element={<AdminInvestmentsPage />} />
              <Route path="deposit-addresses" element={<AdminDepositAddressesPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="deposits" element={<AdminTransactionsPage />} />
              <Route path="withdrawals" element={<AdminTransactionsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Legal Public Routes */}
            <Route path="/legal/terms" element={<TermsOfServicePage />} />
            <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MarketModeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
