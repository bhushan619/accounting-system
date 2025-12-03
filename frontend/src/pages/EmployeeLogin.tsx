import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function EmployeeLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/employee-portal');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/employee-portal/register`, {
        email,
        password,
        employeeId
      });
      
      // Auto login after registration
      localStorage.setItem('token', response.data.access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      window.location.href = '/employee-portal';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-accent p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">VeloSync</h1>
              <p className="text-white/70 text-sm">Employee Portal</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            {t('employeeLogin.welcome') || 'Access Your Payslips & Profile'}
          </h2>
          <p className="text-white/80 text-lg">
            {t('employeeLogin.description') || 'View your salary details, download payslips, and update your personal information.'}
          </p>
        </div>
        
        <p className="text-white/50 text-sm">
          © {new Date().getFullYear()} VeloSync Accounts
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex justify-end mb-4">
          <Link to="/login" className="text-sm text-primary hover:underline">
            {t('employeeLogin.adminLogin') || 'Admin/Accountant Login →'}
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">VeloSync</h1>
                <p className="text-muted-foreground text-sm">Employee Portal</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex mb-6 border-b border-border">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  isLogin ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                {t('login.signIn') || 'Sign In'}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  !isLogin ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                {t('employeeLogin.register') || 'Register'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('employeeId') || 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="EMP001"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('employeeLogin.employeeIdHelp') || 'Enter your Employee ID as provided by HR'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('login.email') || 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="your.email@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('login.password') || 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    {t('loading') || 'Loading...'}
                  </span>
                ) : (
                  isLogin ? (t('login.signIn') || 'Sign In') : (t('employeeLogin.createAccount') || 'Create Account')
                )}
              </button>
            </form>

            {!isLogin && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                {t('employeeLogin.registerNote') || 'Your email must match the email in your employee record.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
