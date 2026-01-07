import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={40} className="text-orange-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {t('pending.title') || 'Account Pending Approval'}
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {t('pending.message') || 'Your account has been created successfully. Please wait for an administrator to assign your role before you can access the system.'}
        </p>
        
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            {t('pending.loggedAs') || 'Logged in as'}
          </p>
          <p className="font-medium text-foreground">{user?.email}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <LogOut size={20} />
          {t('nav.signOut') || 'Sign Out'}
        </button>
        
        <p className="text-xs text-muted-foreground mt-6">
          {t('pending.contactAdmin') || 'If you believe this is an error, please contact your system administrator.'}
        </p>
      </div>
    </div>
  );
}
