/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user && userProfile) {
      navigate(userProfile.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, userProfile, loading, navigate]);

  const validate = () => {
    const errors: Record<string, string> = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!name) {
        errors.name = 'Full Name is required';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.register(name, email, password);
      }
      // Redirection is handled by useEffect listening to auth state changes
    } catch (err: any) {
      console.error(err);
      let message = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already in use.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak.';
      } else if (err.message) {
        message = err.message;
      }
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgMain flex items-center justify-center">
        <svg
          className="animate-spin h-10 w-10 text-goldAccent"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgMain text-textPrimary flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-[-20%] left-[-20%] h-[70vw] w-[70vw] bg-goldAccent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[70vw] w-[70vw] bg-[#EF4444]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div
        className="flex items-center gap-3 mb-10 cursor-pointer select-none"
        onClick={() => navigate('/')}
      >
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-goldAccent text-bgMain font-extrabold text-2xl border border-goldAccent/40 shadow-[0_0_20px_rgba(201,168,76,0.25)]">
          VM
        </div>
        <div>
          <span className="font-extrabold text-2xl tracking-wider text-textPrimary">VANTAGE</span>
          <span className="font-medium text-sm tracking-[0.25em] text-goldAccent block -mt-1 uppercase">
            MARKETS
          </span>
        </div>
      </div>

      {/* Container Card */}
      <Card variant="glass" className="w-full max-w-md p-8 md:p-10 border border-borderCustom shadow-2xl relative z-10">
        {/* Toggle tabs */}
        <div className="flex w-full border-b border-borderCustom/60 mb-8">
          <button
            type="button"
            className={`flex-1 pb-4 text-sm font-bold uppercase tracking-wider transition-colors duration-200 border-b-2 ${
              isLogin
                ? 'text-goldAccent border-goldAccent'
                : 'text-textSecondary border-transparent hover:text-textPrimary'
            }`}
            onClick={() => {
              setIsLogin(true);
              setValidationErrors({});
              setSubmitError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 pb-4 text-sm font-bold uppercase tracking-wider transition-colors duration-200 border-b-2 ${
              !isLogin
                ? 'text-goldAccent border-goldAccent'
                : 'text-textSecondary border-transparent hover:text-textPrimary'
            }`}
            onClick={() => {
              setIsLogin(false);
              setValidationErrors({});
              setSubmitError(null);
            }}
          >
            Register
          </button>
        </div>

        {/* Form Title & Subtitle */}
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-wider text-textPrimary">
            {isLogin ? 'Access Trading Floor' : 'Create Trade Account'}
          </h2>
          <p className="text-xs text-textSecondary font-medium mt-1">
            {isLogin
              ? 'Enter your credentials to enter the Vantage trading systems.'
              : 'Submit the registration form to obtain market execution keys.'}
          </p>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div className="mb-6 p-4 rounded-[8px] bg-danger/10 border border-danger/20 text-xs font-semibold text-danger tracking-wide flex items-center gap-3 animate-fadeIn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Alexander Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={validationErrors.name}
              disabled={isSubmitting}
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. alex@vantage.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={validationErrors.email}
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={validationErrors.password}
            disabled={isSubmitting}
          />

          {!isLogin && (
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={validationErrors.confirmPassword}
              disabled={isSubmitting}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            className="mt-4 uppercase tracking-widest text-xs font-extrabold h-12"
          >
            {isLogin ? 'Sign In to Trade' : 'Generate Account Key'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
