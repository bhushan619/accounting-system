import React, { ReactNode, useState, memo, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../contexts/BrandingContext';
import LanguageSwitcher from './LanguageSwitcher';
import {
  Home,
  Users,
  FileText,
  Receipt,
  Building2,
  Landmark,
  UserCog,
  DollarSign,
  Settings as SettingsIcon,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Wallet,
  PieChart,
  FileSpreadsheet,
  Zap,
  Globe,
  Shield
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default memo(function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(true);
  const [bookkeepingOpen, setBookkeepingOpen] = useState(true);
  const [salaryOpen, setSalaryOpen] = useState(true);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const NavLink = ({ to, icon: Icon, children: linkChildren }: { to: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Link
      to={to}
      className={`nav-link ${isActive(to) ? 'nav-link-active' : 'nav-link-inactive'}`}
    >
      <Icon size={18} />
      {(sidebarOpen || mobileOpen) && <span>{linkChildren}</span>}
    </Link>
  );

  const NavGroup = ({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children: groupChildren
  }: {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode
  }) => (
    <div className="space-y-1">
      <button
        onClick={(e) => { e.preventDefault(); onToggle(); }}
        type="button"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-all duration-200"
      >
        <Icon size={18} />
        {(sidebarOpen || mobileOpen) && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{title}</span>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </>
        )}
      </button>
      {isOpen && (sidebarOpen || mobileOpen) && (
        <div className="ml-4 pl-3 border-l border-sidebar-muted space-y-1 animate-fade-in">
          {groupChildren}
        </div>
      )}
    </div>
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-muted">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Zap className="text-white" size={20} />
          )}
        </div>
        {(sidebarOpen || mobileOpen) && (
          <div className="animate-fade-in min-w-0 flex-1">
            <h1 className="text-lg font-bold text-sidebar-foreground truncate">{branding.brandName}</h1>
            <p className="text-xs text-sidebar-foreground/50">{branding.brandTagline}</p>
          </div>
        )}
        {/* Desktop toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:block ml-auto p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-colors"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
        {user?.role === 'employee' ? (
          <>
            <NavLink to="/employee-portal" icon={Home}>{t('nav.employeePortal')}</NavLink>
            <NavLink to="/guide" icon={BookOpen}>{t('nav.userGuide')}</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/dashboard" icon={Home}>{t('nav.dashboard')}</NavLink>

            <NavGroup
              title={t('nav.masters')}
              icon={Building2}
              isOpen={mastersOpen}
              onToggle={() => setMastersOpen(o => !o)}
            >
              <NavLink to="/clients" icon={Users}>{t('nav.clients')}</NavLink>
              <NavLink to="/vendors" icon={Building2}>{t('nav.vendors')}</NavLink>
              <NavLink to="/banks" icon={Landmark}>{t('nav.banks')}</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/tax-configurations" icon={SettingsIcon}>{t('nav.taxConfig')}</NavLink>
              )}
            </NavGroup>

            <NavGroup
              title={t('nav.bookkeeping')}
              icon={FileText}
              isOpen={bookkeepingOpen}
              onToggle={() => setBookkeepingOpen(o => !o)}
            >
              <NavLink to="/invoices" icon={FileText}>{t('nav.invoices')}</NavLink>
              <NavLink to="/expenses" icon={Receipt}>{t('nav.expenses')}</NavLink>
              <NavLink to="/transactions" icon={Wallet}>{t('nav.transactions')}</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/approvals" icon={FileText}>{t('nav.approvals')}</NavLink>
              )}
              <NavLink to="/reports" icon={PieChart}>{t('nav.financialReports')}</NavLink>
              <NavLink to="/tax-reports" icon={FileSpreadsheet}>{t('nav.taxReports')}</NavLink>
              <NavLink to="/vat-reports" icon={FileSpreadsheet}>{t('nav.vatReports')}</NavLink>
            </NavGroup>

            {(user?.role === 'admin' || user?.role === 'accountant') && (
              <NavGroup
                title={t('nav.salary')}
                icon={DollarSign}
                isOpen={salaryOpen}
                onToggle={() => setSalaryOpen(o => !o)}
              >
                {user?.role === 'admin' && (
                  <NavLink to="/employees" icon={UserCog}>{t('nav.employees')}</NavLink>
                )}
                <NavLink to="/payroll" icon={DollarSign}>{t('nav.payroll')}</NavLink>
              </NavGroup>
            )}

            {user?.role === 'admin' && (
              <NavLink to="/users" icon={Users}>{t('nav.users')}</NavLink>
            )}

            {user?.role === 'admin' && (
              <NavLink to="/audit-logs" icon={Shield}>{t('nav.auditLogs')}</NavLink>
            )}

            {user?.role === 'admin' && (
              <NavLink to="/translations" icon={Globe}>{t('nav.translations')}</NavLink>
            )}

            <NavLink to="/settings" icon={SettingsIcon}>{t('nav.settings')}</NavLink>
            <NavLink to="/guide" icon={BookOpen}>{t('nav.userGuide')}</NavLink>
          </>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-muted space-y-2">
        <LanguageSwitcher collapsed={!(sidebarOpen || mobileOpen)} />

        {(sidebarOpen || mobileOpen) && (
          <div className="mb-3 px-3 animate-fade-in">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
        >
          <LogOut size={18} />
          {(sidebarOpen || mobileOpen) && <span className="text-sm font-medium">{t('nav.signOut')}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex ${sidebarOpen ? 'w-64' : 'w-20'} bg-sidebar-bg flex-col transition-all duration-300 ease-in-out`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-bg flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden flex-shrink-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Zap className="text-white" size={16} />
              )}
            </div>
            <span className="font-semibold text-foreground truncate">{branding.brandName}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
});
