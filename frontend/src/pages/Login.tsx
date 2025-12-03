import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Zap, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { t } = useLanguage();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, pw, fullName);
      } else {
        await login(email, pw);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(isSignup ? (t('login.signupFailed') || 'Signup failed. Please try again.') : (t('login.loginFailed') || 'Login failed. Please check your email and password.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-bg relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
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
            {t('login.tagline1') || 'Streamline Your'}<br />
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('login.tagline2') || 'Financial Management'}
            </span>
          </h2>
          
          <p className="text-lg text-sidebar-foreground/70 mb-8 max-w-md">
            {t('login.description') || 'Complete accountancy solution with invoicing, expenses, payroll, and tax compliance - all in one platform.'}
          </p>
          
          {/* Feature Badges */}
          <div className="flex flex-wrap gap-3">
            {[t('nav.invoices'), t('nav.expenses'), t('nav.payroll'), t('taxReports.title')].map((feature) => (
              <span 
                key={feature}
                className="px-4 py-2 bg-sidebar-muted/50 text-sidebar-foreground/80 rounded-full text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col p-8">
        {/* Language Switcher */}
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {isSignup ? (t('login.createAccount') || 'Create Account') : (t('login.welcomeBack') || 'Welcome Back')}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isSignup ? (t('login.signupSubtitle') || 'Start managing your finances today') : (t('login.loginSubtitle') || 'Sign in to continue to your dashboard')}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-fade-in">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              {isSignup && (
                <div className="form-group animate-fade-in">
                  <label className="input-label">{t('users.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="input pl-11"
                      placeholder={t('login.enterFullName') || 'Enter your full name'}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-11"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
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
                className="btn btn-primary btn-lg w-full group"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{isSignup ? (t('login.creatingAccount') || 'Creating account...') : (t('login.signingIn') || 'Signing in...')}</span>
                  </>
                ) : (
                  <>
                    <span>{isSignup ? (t('login.createAccount') || 'Create Account') : t('login.signIn')}</span>
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                {isSignup ? (t('login.haveAccount') || 'Already have an account?') : (t('login.noAccount') || "Don't have an account?")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError(null);
                }}
                className="mt-2 text-primary font-medium hover:underline"
              >
                {isSignup ? (t('login.signInInstead') || 'Sign in instead') : (t('login.createAccountLink') || 'Create an account')}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} VeloSync. {t('login.allRightsReserved') || 'All rights reserved.'}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
