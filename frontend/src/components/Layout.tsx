import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Users, 
  FileText, 
  Receipt, 
  Building2, 
  Landmark, 
  UserCog, 
  DollarSign, 
  BarChart3, 
  Settings as SettingsIcon, 
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Wallet,
  PieChart
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mastersOpen, setMastersOpen] = useState(true);
  const [bookkeepingOpen, setBookkeepingOpen] = useState(true);
  const [salaryOpen, setSalaryOpen] = useState(true);

  // Debug: print current authenticated user details
  console.log('Layout current user:', user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-card shadow-lg transition-all duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          {sidebarOpen && <h1 className="text-xl font-bold text-primary">VeloSync</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-accent rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/dashboard')
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <Home size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>

          {/* Masters Group */}
          <div className="space-y-1">
            <button
              onClick={() => setMastersOpen(!mastersOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {mastersOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              {sidebarOpen && <span className="font-medium">Masters</span>}
            </button>
            {mastersOpen && sidebarOpen && (
              <div className="ml-6 space-y-1">
                <Link
                  to="/clients"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/clients')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Users size={20} />
                  <span>Clients</span>
                </Link>
                <Link
                  to="/vendors"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/vendors')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Building2 size={20} />
                  <span>Vendors</span>
                </Link>
                <Link
                  to="/banks"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/banks')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Landmark size={20} />
                  <span>Banks</span>
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/tax-configurations"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/tax-configurations')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <SettingsIcon size={20} />
                    <span>Tax Configurations</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Bookkeeping Group */}
          <div className="space-y-1">
            <button
              onClick={() => setBookkeepingOpen(!bookkeepingOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {bookkeepingOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              {sidebarOpen && <span className="font-medium">Bookkeeping</span>}
            </button>
            {bookkeepingOpen && sidebarOpen && (
              <div className="ml-6 space-y-1">
                <Link
                  to="/invoices"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/invoices')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <FileText size={20} />
                  <span>Invoices</span>
                </Link>
                <Link
                  to="/expenses"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/expenses')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Receipt size={20} />
                  <span>Expenses</span>
                </Link>
                <Link
                  to="/transactions"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/transactions')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Wallet size={20} />
                  <span>Transactions</span>
                </Link>
                <Link
                  to="/reports"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/reports')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <PieChart size={20} />
                  <span>Financial Reports</span>
                </Link>
              </div>
            )}
          </div>

          {/* Salary Group (Admin only) */}
          {user?.role === 'admin' && (
            <div className="space-y-1">
              <button
                onClick={() => setSalaryOpen(!salaryOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {salaryOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                {sidebarOpen && <span className="font-medium">Salary</span>}
              </button>
              {salaryOpen && sidebarOpen && (
                <div className="ml-6 space-y-1">
                  <Link
                    to="/employees"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/employees')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <UserCog size={20} />
                    <span>Employees</span>
                  </Link>
                  <Link
                    to="/payroll"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/payroll')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <DollarSign size={20} />
                    <span>Payroll</span>
                  </Link>
                  <Link
                    to="/payroll-runs"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/payroll-runs')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <BarChart3 size={20} />
                    <span>Payroll Runs</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Users (Admin only) */}
          {user?.role === 'admin' && (
            <Link
              to="/users"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/users')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <Users size={20} />
              {sidebarOpen && <span>Users</span>}
            </Link>
          )}

          {/* User Guide */}
          <Link
            to="/guide"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/guide')
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <BookOpen size={20} />
            {sidebarOpen && <span>User Guide</span>}
          </Link>
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
