import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { User, Lock, Building, Globe, Mail, Save, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, DollarSign } from 'lucide-react';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxNumber: string;
  currency: string;
  dateFormat: string;
  fiscalYearStart: string;
  region: string;
}

interface DefaultSettings {
  defaultPaymentTerms: number;
  defaultInvoiceDuedays: number;
  defaultCurrency: string;
  stampFee: number;
  emailNotifications: boolean;
  autoApproveAdminTransactions: boolean;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
}

interface CurrencySettings {
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRates: {
    LKR_AED: number;
    AED_LKR: number;
  };
  vatRates: {
    LK: { standard: number; zeroRated: number };
    AE: { standard: number; zeroRated: number };
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'company' | 'defaults' | 'email' | 'currency'>('profile');
  const [showModal, _setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Password change
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: ''
  });
  
  // Company settings (admin only)
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: 'VeloSync Accounts',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxNumber: '',
    currency: 'LKR',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: '01-01',
    region: 'LK'
  });
  
  // Default settings (admin only)
  const [defaultSettings, setDefaultSettings] = useState<DefaultSettings>({
    defaultPaymentTerms: 30,
    defaultInvoiceDuedays: 14,
    defaultCurrency: 'LKR',
    stampFee: 25,
    emailNotifications: true,
    autoApproveAdminTransactions: true
  });

  // Email settings (admin only)
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: ''
  });

  // Currency settings (admin only)
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>({
    baseCurrency: 'LKR',
    supportedCurrencies: ['LKR', 'AED'],
    exchangeRates: {
      LKR_AED: 0.010,
      AED_LKR: 100.0
    },
    vatRates: {
      LK: { standard: 18, zeroRated: 0 },
      AE: { standard: 5, zeroRated: 0 }
    }
  });

  usePreventSwipe(showModal);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/settings`);
      const { company, defaults, email, currency } = response.data;
      
      if (company) setCompanySettings(company);
      if (defaults) setDefaultSettings(defaults);
      if (email) setEmailSettings(email);
      if (currency) setCurrencySettings(currency);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showMessage('success', 'Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${user?.id}`, {
        fullName: profileData.fullName
      });
      showMessage('success', 'Profile updated successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanySettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/settings/company`, companySettings);
      showMessage('success', 'Company settings saved successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDefaultSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/settings/defaults`, defaultSettings);
      showMessage('success', 'Default settings saved successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save default settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/settings/email`, emailSettings);
      showMessage('success', 'Email settings saved successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencySettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/settings/currency`, currencySettings);
      showMessage('success', 'Currency settings saved successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save currency settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile') || 'Profile', icon: User },
    { id: 'password', label: t('settings.changePassword') || 'Change Password', icon: Lock },
    ...(isAdmin ? [
      { id: 'company', label: t('settings.company') || 'Company', icon: Building },
      { id: 'defaults', label: t('settings.defaults') || 'Defaults', icon: Globe },
      { id: 'currency', label: 'Currency & VAT', icon: DollarSign },
      { id: 'email', label: t('settings.email') || 'Email', icon: Mail },
    ] : [])
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t('settings.title') || 'Settings'}</h1>
      <p className="text-muted-foreground mb-6">{t('settings.subtitle') || 'Manage your account and application settings'}</p>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t('settings.profileInfo') || 'Profile Information'}</h2>
              
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.fullName') || 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.email') || 'Email'}
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('settings.role') || 'Role'}
                  </label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed capitalize"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : t('common.save') || 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t('settings.changePassword') || 'Change Password'}</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('settings.currentPassword') || 'Current Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('settings.newPassword') || 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('settings.confirmPassword') || 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Lock size={18} />
                    {saving ? 'Changing...' : t('settings.updatePassword') || 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Company Tab (Admin Only) */}
          {activeTab === 'company' && isAdmin && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t('settings.companyInfo') || 'Company Information'}</h2>
              
              <form onSubmit={handleCompanySettingsSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.companyName') || 'Company Name'}
                    </label>
                    <input
                      type="text"
                      value={companySettings.companyName}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.taxNumber') || 'Tax Registration Number'}
                    </label>
                    <input
                      type="text"
                      value={companySettings.taxNumber}
                      onChange={(e) => setCompanySettings({ ...companySettings, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('settings.companyAddress') || 'Company Address'}
                  </label>
                  <textarea
                    value={companySettings.companyAddress}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.companyPhone') || 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={companySettings.companyPhone}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.companyEmail') || 'Email'}
                    </label>
                    <input
                      type="email"
                      value={companySettings.companyEmail}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Region
                    </label>
                    <select
                      value={companySettings.region || 'LK'}
                      onChange={(e) => setCompanySettings({ ...companySettings, region: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="LK">🇱🇰 Sri Lanka</option>
                      <option value="AE">🇦🇪 UAE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.currency') || 'Default Currency'}
                    </label>
                    <select
                      value={companySettings.currency}
                      onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      <option value="AED">AED - UAE Dirham</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.dateFormat') || 'Date Format'}
                    </label>
                    <select
                      value={companySettings.dateFormat}
                      onChange={(e) => setCompanySettings({ ...companySettings, dateFormat: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.fiscalYearStart') || 'Fiscal Year Start'}
                    </label>
                    <select
                      value={companySettings.fiscalYearStart}
                      onChange={(e) => setCompanySettings({ ...companySettings, fiscalYearStart: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="01-01">January 1</option>
                      <option value="04-01">April 1</option>
                      <option value="07-01">July 1</option>
                      <option value="10-01">October 1</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : t('common.save') || 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Defaults Tab (Admin Only) */}
          {activeTab === 'defaults' && isAdmin && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t('settings.defaultSettings') || 'Default Settings'}</h2>
              
              <form onSubmit={handleDefaultSettingsSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.paymentTerms') || 'Default Payment Terms (days)'}
                    </label>
                    <input
                      type="number"
                      value={defaultSettings.defaultPaymentTerms}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultPaymentTerms: parseInt(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.invoiceDueDays') || 'Invoice Due Days'}
                    </label>
                    <input
                      type="number"
                      value={defaultSettings.defaultInvoiceDuedays}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultInvoiceDuedays: parseInt(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.defaultCurrency') || 'Default Currency'}
                    </label>
                    <select
                      value={defaultSettings.defaultCurrency}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      <option value="AED">AED - UAE Dirham</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('settings.stampFee') || 'Stamp Fee (LKR)'}
                    </label>
                    <input
                      type="number"
                      value={defaultSettings.stampFee}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, stampFee: parseFloat(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">{t('settings.preferences') || 'Preferences'}</h3>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{t('settings.emailNotifications') || 'Email Notifications'}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.emailNotificationsDesc') || 'Send email notifications for important events'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultSettings.emailNotifications}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, emailNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{t('settings.autoApprove') || 'Auto-approve Admin Transactions'}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.autoApproveDesc') || 'Automatically approve transactions created by admin users'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultSettings.autoApproveAdminTransactions}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, autoApproveAdminTransactions: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : t('common.save') || 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Currency & VAT Tab (Admin Only) */}
          {activeTab === 'currency' && isAdmin && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Currency & VAT Configuration</h2>
              
              <form onSubmit={handleCurrencySettingsSave} className="space-y-6">
                {/* Base Currency */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Base Currency</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Default Base Currency</label>
                      <select
                        value={currencySettings.baseCurrency}
                        onChange={(e) => setCurrencySettings({ ...currencySettings, baseCurrency: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="LKR">LKR - Sri Lankan Rupee</option>
                        <option value="AED">AED - UAE Dirham</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Exchange Rates */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Fixed Exchange Rates</h3>
                  <p className="text-sm text-muted-foreground mb-4">Set the fixed exchange rates between supported currencies.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">1 LKR = AED</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={currencySettings.exchangeRates.LKR_AED}
                        onChange={(e) => setCurrencySettings({
                          ...currencySettings,
                          exchangeRates: { ...currencySettings.exchangeRates, LKR_AED: parseFloat(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">1 AED = LKR</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currencySettings.exchangeRates.AED_LKR}
                        onChange={(e) => setCurrencySettings({
                          ...currencySettings,
                          exchangeRates: { ...currencySettings.exchangeRates, AED_LKR: parseFloat(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* VAT Rates by Region */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">VAT Rates by Region</h3>
                  
                  {/* Sri Lanka VAT */}
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-3">🇱🇰 Sri Lanka (IRD)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Standard VAT Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={currencySettings.vatRates.LK.standard}
                          onChange={(e) => setCurrencySettings({
                            ...currencySettings,
                            vatRates: {
                              ...currencySettings.vatRates,
                              LK: { ...currencySettings.vatRates.LK, standard: parseFloat(e.target.value) }
                            }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Zero-Rated VAT (%)</label>
                        <input
                          type="number"
                          value={currencySettings.vatRates.LK.zeroRated}
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Zero-rated for exports</p>
                      </div>
                    </div>
                  </div>

                  {/* UAE VAT */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-3">🇦🇪 UAE (FTA Regulations)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Standard VAT Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={currencySettings.vatRates.AE.standard}
                          onChange={(e) => setCurrencySettings({
                            ...currencySettings,
                            vatRates: {
                              ...currencySettings.vatRates,
                              AE: { ...currencySettings.vatRates.AE, standard: parseFloat(e.target.value) }
                            }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1">UAE standard rate: 5%</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Zero-Rated VAT (%)</label>
                        <input
                          type="number"
                          value={currencySettings.vatRates.AE.zeroRated}
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">For exports, international transport, precious metals</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Email Tab (Admin Only) */}
          {activeTab === 'email' && isAdmin && (
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t('settings.emailConfiguration') || 'Email Configuration'}</h2>
              
              <form onSubmit={handleEmailSettingsSave} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">{t('settings.smtpConfiguration') || 'SMTP Configuration'}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('settings.smtpConfigurationDesc') || 'Configure SMTP server for sending emails.'}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('settings.smtpHost') || 'SMTP Host'}</label>
                      <input
                        type="text"
                        value={emailSettings.smtpHost}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                        placeholder="smtp.example.com"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('settings.smtpPort') || 'SMTP Port'}</label>
                      <input
                        type="text"
                        value={emailSettings.smtpPort}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                        placeholder="587"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('settings.smtpUsername') || 'SMTP Username'}</label>
                      <input
                        type="text"
                        value={emailSettings.smtpUser}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('settings.smtpPassword') || 'SMTP Password'}</label>
                      <input
                        type="password"
                        value={emailSettings.smtpPassword}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : t('common.save') || 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
