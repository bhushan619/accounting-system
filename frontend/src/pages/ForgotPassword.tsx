import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { Zap, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Request reset token from backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, { email });
      
      if (response.data.resetToken) {
        // Send email via EmailJS
        const resetLink = `${window.location.origin}/reset-password?token=${response.data.resetToken}`;
        
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID,
          {
            to_email: email,
            to_name: response.data.fullName,
            reset_link: resetLink,
            app_name: 'VeloSync Accounts',
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        );
      }
      
      setSent(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(t('forgotPassword.error') || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            {t('forgotPassword.resetYour') || 'Reset Your'}<br />
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('forgotPassword.password') || 'Password'}
            </span>
          </h2>
          
          <p className="text-lg text-sidebar-foreground/70 mb-8 max-w-md">
            {t('forgotPassword.description') || "Don't worry, it happens to the best of us. Enter your email and we'll send you a reset link."}
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
              {sent ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {t('forgotPassword.emailSent') || 'Email Sent!'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('forgotPassword.checkInbox') || 'Check your inbox for the password reset link. The link will expire in 1 hour.'}
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
                      {t('forgotPassword.title') || 'Forgot Password?'}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {t('forgotPassword.subtitle') || 'Enter your email to receive a reset link'}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-fade-in">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
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

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary btn-lg w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>{t('forgotPassword.sending') || 'Sending...'}</span>
                        </>
                      ) : (
                        <span>{t('forgotPassword.sendResetLink') || 'Send Reset Link'}</span>
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
