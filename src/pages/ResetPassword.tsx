import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import { Zap, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch') || 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError(t('resetPassword.passwordTooShort') || 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        token,
        newPassword: password,
      });
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.error || t('resetPassword.error') || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('resetPassword.invalidLink') || 'Invalid Reset Link'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('resetPassword.invalidLinkDescription') || 'This password reset link is invalid or has expired.'}
          </p>
          <Link to="/forgot-password" className="btn btn-primary">
            {t('resetPassword.requestNewLink') || 'Request New Link'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-bg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-sidebar-foreground">VeloSync</h1>
              <p className="text-sidebar-foreground/60">{t('login.accounts') || 'Accounts'}</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-sidebar-foreground mb-4 leading-tight">
            {t('resetPassword.createNew') || 'Create New'}<br />
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('resetPassword.password') || 'Password'}
            </span>
          </h2>
          
          <p className="text-lg text-sidebar-foreground/70 mb-8 max-w-md">
            {t('resetPassword.description') || 'Choose a strong password that you haven\'t used before.'}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">VeloSync</h1>
                <p className="text-xs text-muted-foreground">{t('login.accounts') || 'Accounts'}</p>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
              {success ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {t('resetPassword.success') || 'Password Reset!'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('resetPassword.redirecting') || 'Your password has been reset successfully. Redirecting to login...'}
                  </p>
                  <Link
                    to="/login"
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    {t('forgotPassword.backToLogin') || 'Back to Login'}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-foreground">
                      {t('resetPassword.title') || 'Reset Password'}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {t('resetPassword.subtitle') || 'Enter your new password below'}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-fade-in">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="form-group">
                      <label className="input-label">{t('resetPassword.newPassword') || 'New Password'}</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="input pl-11"
                          placeholder="••••••••"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="input-label">{t('resetPassword.confirmPassword') || 'Confirm Password'}</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="input pl-11"
                          placeholder="••••••••"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary btn-lg w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>{t('resetPassword.resetting') || 'Resetting...'}</span>
                        </>
                      ) : (
                        <span>{t('resetPassword.resetPassword') || 'Reset Password'}</span>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link
                      to="/login"
                      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <ArrowLeft size={16} />
                      {t('forgotPassword.backToLogin') || 'Back to Login'}
                    </Link>
                  </div>
                </>
              )}
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} VeloSync. {t('login.allRightsReserved') || 'All rights reserved.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
