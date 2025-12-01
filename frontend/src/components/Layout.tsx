import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  Globe
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mastersOpen, setMastersOpen] = useState(true);
  const [bookkeepingOpen, setBookkeepingOpen] = useState(true);
  const [salaryOpen, setSalaryOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, children: linkChildren }: { to: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Link
      to={to}
      className={`nav-link ${isActive(to) ? 'nav-link-active' : 'nav-link-inactive'}`}
    >
      <Icon size={18} />
      {sidebarOpen && <span>{linkChildren}</span>}
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
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-all duration-200"
      >
        <Icon size={18} />
        {sidebarOpen && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{title}</span>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </>
        )}
      </button>
      {isOpen && sidebarOpen && (
        <div className="ml-4 pl-3 border-l border-sidebar-muted space-y-1 animate-fade-in">
          {groupChildren}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-sidebar-bg flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-muted">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Zap className="text-white" size={20} />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold text-sidebar-foreground">VeloSync</h1>
              <p className="text-xs text-sidebar-foreground/50">Accounts</p>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="ml-auto p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {/* Dashboard */}
          <NavLink to="/dashboard" icon={Home}>{t('nav.dashboard')}</NavLink>

          {/* Masters Group */}
          <NavGroup 
            title={t('nav.masters')} 
            icon={Building2}
            isOpen={mastersOpen} 
            onToggle={() => setMastersOpen(!mastersOpen)}
          >
            <NavLink to="/clients" icon={Users}>{t('nav.clients')}</NavLink>
            <NavLink to="/vendors" icon={Building2}>{t('nav.vendors')}</NavLink>
            <NavLink to="/banks" icon={Landmark}>{t('nav.banks')}</NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/tax-configurations" icon={SettingsIcon}>{t('nav.taxConfig')}</NavLink>
            )}
          </NavGroup>

          {/* Bookkeeping Group */}
          <NavGroup 
            title={t('nav.bookkeeping')} 
            icon={FileText}
            isOpen={bookkeepingOpen} 
            onToggle={() => setBookkeepingOpen(!bookkeepingOpen)}
          >
            <NavLink to="/invoices" icon={FileText}>{t('nav.invoices')}</NavLink>
            <NavLink to="/expenses" icon={Receipt}>{t('nav.expenses')}</NavLink>
            <NavLink to="/transactions" icon={Wallet}>{t('nav.transactions')}</NavLink>
            <NavLink to="/reports" icon={PieChart}>{t('nav.financialReports')}</NavLink>
            <NavLink to="/tax-reports" icon={FileSpreadsheet}>{t('nav.taxReports')}</NavLink>
          </NavGroup>

          {/* Salary Group (Admin only) */}
          {user?.role === 'admin' && (
            <NavGroup 
              title={t('nav.salary')} 
              icon={DollarSign}
              isOpen={salaryOpen} 
              onToggle={() => setSalaryOpen(!salaryOpen)}
            >
              <NavLink to="/employees" icon={UserCog}>{t('nav.employees')}</NavLink>
              <NavLink to="/payroll" icon={DollarSign}>{t('nav.payroll')}</NavLink>
            </NavGroup>
          )}

          {/* Users (Admin only) */}
          {user?.role === 'admin' && (
            <NavLink to="/users" icon={Users}>{t('nav.users')}</NavLink>
          )}

          {/* Translations (Admin only) */}
          {user?.role === 'admin' && (
            <NavLink to="/translations" icon={Globe}>{t('nav.translations')}</NavLink>
          )}

          {/* User Guide */}
          <NavLink to="/guide" icon={BookOpen}>{t('nav.userGuide')}</NavLink>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-sidebar-muted space-y-2">
          {/* Language Switcher */}
          <LanguageSwitcher collapsed={!sidebarOpen} />
          
          {sidebarOpen && (
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
            {sidebarOpen && <span className="text-sm font-medium">{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
