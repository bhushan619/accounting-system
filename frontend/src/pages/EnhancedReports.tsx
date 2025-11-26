import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Calendar } from 'lucide-react';

export default function EnhancedReports() {
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
    loadReports();
  }, [dateRange, activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      
      if (activeTab === 'overview') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/overview${params}`, { headers });
        setOverviewData(res.data);
      } else if (activeTab === 'profitloss') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/profit-loss${params}`, { headers });
        setProfitLossData(res.data);
      } else if (activeTab === 'expenses') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/reports/expenses-breakdown${params}`, { headers });
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
        <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-card rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-muted-foreground" />
          <div className="flex gap-4 items-center flex-1">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
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
              Apply Filter
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
            Overview
          </button>
          <button
            onClick={() => setActiveTab('profitloss')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'profitloss'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'expenses'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Expenses Breakdown
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-muted-foreground">Loading...</div>}

      {/* Overview Tab */}
      {!loading && activeTab === 'overview' && overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-foreground">Rs. {overviewData.totalRevenue?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.invoiceCount} invoices</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Expenses</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalExpenses?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.expenseCount} expenses</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Payroll Costs</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalPayroll?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{overviewData.payrollCount} payroll entries</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Costs</h3>
            <p className="text-3xl font-bold text-destructive">Rs. {overviewData.totalCosts?.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">Expenses + Payroll</p>
          </div>
          
          <div className="bg-card rounded-lg shadow p-6 md:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Net Profit</h3>
            <p className={`text-3xl font-bold ${overviewData.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              Rs. {overviewData.profit?.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {overviewData.profit >= 0 ? 'Profit' : 'Loss'}
            </p>
          </div>
        </div>
      )}

      {/* Profit & Loss Tab */}
      {!loading && activeTab === 'profitloss' && profitLossData && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">Revenue</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.revenue?.invoices?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.client?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={2}>Total Revenue</td>
                  <td className="px-6 py-4 text-sm text-foreground text-right">
                    Rs. {profitLossData.revenue?.total?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">Expenses</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.costs?.expenses?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.vendor?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-destructive text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={3}>Total Expenses</td>
                  <td className="px-6 py-4 text-sm text-destructive text-right">
                    Rs. {profitLossData.costs?.totalExpenses?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="bg-muted px-6 py-3">
              <h3 className="font-semibold text-foreground">Payroll</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profitLossData.costs?.payroll?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-foreground">{item.employee?.fullName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.month}/{item.year}</td>
                    <td className="px-6 py-4 text-sm text-destructive text-right">Rs. {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-6 py-4 text-sm text-foreground" colSpan={2}>Total Payroll</td>
                  <td className="px-6 py-4 text-sm text-destructive text-right">
                    Rs. {profitLossData.costs?.totalPayroll?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-foreground">Net Profit/Loss</h3>
              <p className={`text-3xl font-bold ${(profitLossData.revenue?.total - (profitLossData.costs?.totalExpenses + profitLossData.costs?.totalPayroll)) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                Rs. {((profitLossData.revenue?.total || 0) - ((profitLossData.costs?.totalExpenses || 0) + (profitLossData.costs?.totalPayroll || 0))).toLocaleString()}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Count</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Percentage</th>
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
                <td className="px-6 py-4 text-sm text-foreground">Total</td>
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
