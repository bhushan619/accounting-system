import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Loader2,
  Users,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { loading: authLoading, token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Date filter state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    if (!authLoading && token) {
      loadStats();
    }
  }, [authLoading, token]);

  const loadStats = async (applyFilter = false) => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/reports/overview`;
      
      if (applyFilter && startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
        setFilterApplied(true);
      } else if (!applyFilter) {
        setFilterApplied(false);
      }
      
      const response = await axios.get(url);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    loadStats(true);
  };

  const handleClearFilter = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    loadStats(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      trend: 'up',
      color: 'success',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      title: 'Total Expenses',
      value: stats?.totalExpenses || 0,
      icon: TrendingDown,
      trend: 'down',
      color: 'danger',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    {
      title: 'Net Profit',
      value: stats?.profit || 0,
      icon: TrendingUp,
      trend: 'up',
      color: 'primary',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
    },
    {
      title: 'Total Invoices',
      value: stats?.invoiceCount || 0,
      icon: FileText,
      trend: 'neutral',
      color: 'info',
      bgColor: 'bg-slate-50',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueColor: 'text-foreground',
      isCount: true,
    },
  ];

  // Add payroll card for admin users
  if (isAdmin) {
    statCards.push({
      title: 'Total Payroll',
      value: stats?.totalPayroll || 0,
      icon: Users,
      trend: 'neutral',
      color: 'warning',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      isCount: false,
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/invoices')}
            className="btn btn-primary btn-md"
          >
            <Plus size={18} />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter size={18} />
              <span className="font-medium">Filter by Date:</span>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApplyFilter}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
                >
                  Apply Filter
                </button>
                {filterApplied && (
                  <button
                    onClick={handleClearFilter}
                    className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          {filterApplied && (
            <div className="mt-3 text-sm text-primary">
              Showing data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6 mb-8`}>
        {statCards.map((stat, index) => (
          <div 
            key={stat.title}
            className="stat-card animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`stat-icon ${stat.iconBg}`}>
                <stat.icon className={stat.iconColor} size={22} />
              </div>
              {stat.trend !== 'neutral' && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
            <p className={`text-2xl font-bold ${stat.valueColor}`}>
              {stat.isCount 
                ? stat.value.toLocaleString()
                : `LKR ${stat.value.toLocaleString()}`
              }
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="card-body space-y-3">
            <button 
              onClick={() => navigate('/invoices')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all duration-200 group"
            >
              <div className="icon-container icon-primary">
                <FileText size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Create Invoice</p>
                <p className="text-sm text-muted-foreground">Generate a new invoice for clients</p>
              </div>
              <ArrowUpRight className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </button>
            
            <button 
              onClick={() => navigate('/expenses')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-100 transition-all duration-200 group"
            >
              <div className="icon-container icon-danger">
                <Receipt size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Record Expense</p>
                <p className="text-sm text-muted-foreground">Log a new business expense</p>
              </div>
              <ArrowUpRight className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </button>
            
            {isAdmin && (
              <button 
                onClick={() => navigate('/payroll')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-100 transition-all duration-200 group"
              >
                <div className="icon-container bg-orange-100 text-orange-600">
                  <Users size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Process Payroll</p>
                  <p className="text-sm text-muted-foreground">Generate and manage employee payroll</p>
                </div>
                <ArrowUpRight className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
              </button>
            )}
            
            <button 
              onClick={() => navigate('/reports')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-all duration-200 group"
            >
              <div className="icon-container bg-slate-100 text-slate-600">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">View Reports</p>
                <p className="text-sm text-muted-foreground">Analyze your financial data</p>
              </div>
              <ArrowUpRight className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-foreground">Financial Summary</h2>
          </div>
          <div className="card-body">
            {stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="icon-container icon-success">
                      <TrendingUp size={18} />
                    </div>
                    <span className="text-sm text-foreground">Revenue</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    LKR {stats.totalRevenue?.toLocaleString() || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="icon-container icon-danger">
                      <TrendingDown size={18} />
                    </div>
                    <span className="text-sm text-foreground">Expenses</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    LKR {stats.totalExpenses?.toLocaleString() || 0}
                  </span>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="icon-container bg-orange-100 text-orange-600">
                        <Users size={18} />
                      </div>
                      <span className="text-sm text-foreground">Payroll</span>
                    </div>
                    <span className="font-semibold text-orange-600">
                      LKR {stats.totalPayroll?.toLocaleString() || 0}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="icon-container icon-primary">
                        <DollarSign size={18} />
                      </div>
                      <span className="text-sm font-medium text-foreground">Net Profit</span>
                    </div>
                    <span className={`font-bold text-lg ${(stats.profit || 0) >= 0 ? 'text-primary' : 'text-red-600'}`}>
                      LKR {stats.profit?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No financial data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
