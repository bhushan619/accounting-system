import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function EnhancedReports() {
  const { t } = useLanguage();
  const { loading: authLoading, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'profitloss' | 'expenses'>('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [overviewData, setOverviewData] = useState<any>(null);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  const [expensesData, setExpensesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && token) {
      loadReports();
    }
  }, [dateRange, activeTab, authLoading, token]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      
      if (activeTab === 'overview') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/overview${params}`);
        setOverviewData(res.data);
      } else if (activeTab === 'profitloss') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/profit-loss${params}`);
        setProfitLossData(res.data);
      } else if (activeTab === 'expenses') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/expenses-breakdown${params}`);
        setExpensesData(res.data);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Export logic would go here
    alert('Export functionality coming soon!');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('reports.title')}</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Download size={20} />
          {t('common.export')} {t('reports.report') || 'Report'}
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-card rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-muted-foreground" />
          <div className="flex gap-4 items-center flex-1">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('common.startDate')}</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('common.endDate')}</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <button
              onClick={loadReports}
              className="mt-6 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
            >
              {t('common.applyFilter')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('enhancedReports.overview')}
          </button>
          <button
            onClick={() => setActiveTab('profitloss')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'profitloss'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('enhancedReports.profitLoss')}
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'expenses'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('enhancedReports.expensesBreakdown')}
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>}

      {/* Overview Tab */}
      {!loading && activeTab === 'overview' && overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('enhancedReports.totalRevenue')}</h3>
            <p className="text-3xl font-bold text-foreground">Rs. {overviewData.totalRevenue?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.invoiceCount} {t('enhancedReports.invoices')}</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('enhancedReports.totalExpenses')}</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalExpenses?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.expenseCount} {t('enhancedReports.expensesLabel')}</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('enhancedReports.payrollCosts')}</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalPayroll?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.payrollCount} {t('enhancedReports.payrollEntries')}</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('enhancedReports.totalCosts')}</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalCosts?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('enhancedReports.expensesPlusPayroll')}</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6 md:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('enhancedReports.netProfit')}</h3>
            <p className={`text-3xl font-bold ${overviewData.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              Rs. {overviewData.profit?.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {overviewData.profit >= 0 ? t('enhancedReports.profit') : t('enhancedReports.loss')}
            </p>
          </div>
        </div>
      )}

      {/* Profit & Loss Tab */}
      {!loading && activeTab === 'profitloss' && profitLossData && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">{t('enhancedReports.revenue')}</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('date')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.revenue?.invoices?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={2}>{t('enhancedReports.totalRevenue')}</td>
                  <td className="px-6 py-4 text-sm text-foreground text-right">
                    Rs. {profitLossData.revenue?.total?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">{t('enhancedReports.expensesLabel')}</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('date')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.costs?.expenses?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-destructive text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={3}>{t('enhancedReports.totalExpenses')}</td>
                  <td className="px-6 py-4 text-sm text-destructive text-right">
                    Rs. {profitLossData.costs?.totalExpenses?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">{t('payroll')}</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('enhancedReports.period')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.costs?.payroll?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.employee?.fullName || t('enhancedReports.unknown')}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.month}/{item.year}</td>
                    <td className="px-6 py-4 text-sm text-destructive text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {profitLossData.costs?.payrollExpenses?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-destructive text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={2}>{t('enhancedReports.totalPayroll')}</td>
                  <td className="px-6 py-4 text-sm text-destructive text-right">
                    Rs. {((profitLossData.costs?.totalPayroll || 0) + (profitLossData.costs?.totalPayrollExpenses || 0)).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-foreground">{t('enhancedReports.netProfitLoss')}</h3>
              <p className={`text-3xl font-bold ${(profitLossData.revenue?.total - (profitLossData.costs?.totalExpenses + profitLossData.costs?.totalPayroll + profitLossData.costs?.totalPayrollExpenses)) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                Rs. {((profitLossData.revenue?.total || 0) - ((profitLossData.costs?.totalExpenses || 0) + (profitLossData.costs?.totalPayroll || 0) + (profitLossData.costs?.totalPayrollExpenses || 0))).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Breakdown Tab */}
      {!loading && activeTab === 'expenses' && expensesData && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('category')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('enhancedReports.count')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('enhancedReports.totalAmount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('enhancedReports.percentage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expensesData.byCategory && Object.entries(expensesData.byCategory).map(([category, data]: [string, any]) => {
                const totalAmount = Object.values(expensesData.byCategory).reduce((sum: number, cat: any) => sum + cat.total, 0);
                const percentage = (data.total / totalAmount) * 100;
                return (
                  <tr key={category}>
                    <td className="px-6 py-4 text-sm text-foreground capitalize">{category}</td>
                    <td className="px-6 py-4 text-sm text-foreground text-right">{data.count}</td>
                    <td className="px-6 py-4 text-sm text-foreground text-right">Rs. {data.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground text-right">{percentage.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-6 py-4 text-sm text-foreground">{t('enhancedReports.total')}</td>
                <td className="px-6 py-4 text-sm text-foreground text-right">
                  {expensesData.byCategory && Object.values(expensesData.byCategory).reduce((sum: number, cat: any) => sum + cat.count, 0)}
                </td>
                <td className="px-6 py-4 text-sm text-foreground text-right">
                  Rs. {expensesData.byCategory && Object.values(expensesData.byCategory).reduce((sum: number, cat: any) => sum + cat.total, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
