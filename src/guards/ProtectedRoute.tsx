import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowOnboardingPending?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowOnboardingPending = false,
}) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <Loader variant="full-screen" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!userProfile) {
    return <Loader variant="full-screen" />;
  }

  if (userProfile.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // If user profile is loaded, check onboarding status
  if (!userProfile.onboardingCompleted && !allowOnboardingPending) {
    console.log('[ProtectedRoute] User onboarding pending. Redirecting to /market-selection.');
    return <Navigate to="/market-selection" replace />;
  }
  if (userProfile.onboardingCompleted && allowOnboardingPending) {
    console.log('[ProtectedRoute] User onboarding already completed. Redirecting to /dashboard.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
