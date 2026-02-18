import { useState, useEffect } from 'react';
import axios from 'axios';
import { fmtCurrency, currencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Calculator, ArrowRightLeft } from 'lucide-react';

interface CurrencySettings {
  baseCurrency: string;
  exchangeRates: { LKR_AED: number; AED_LKR: number };
  vatRates: {
    LK: { standard: number; zeroRated: number };
    AE: { standard: number; zeroRated: number };
  };
}

export default function VATReports() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [region, setRegion] = useState('LK');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const [currencyRes, companyRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/settings/currency`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),
        axios.get(`${import.meta.env.VITE_API_URL}/settings/company`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { region: 'LK' } }))
      ]);
      if (currencyRes.data) setCurrencySettings(currencyRes.data);
      if (companyRes.data?.region) {
        setRegion(companyRes.data.region);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) return alert('Please select date range');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/vat-reports/vat-return`, {
        params: { startDate, endDate, region },
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(res.data);
    } catch (error) {
      console.error('Error generating VAT report:', error);
      alert('Failed to generate report');
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number, currency: string = 'LKR') => {
    return fmtCurrency(amount, currency);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('vatReports.title') || 'VAT Returns'}</h1>
        <p className="text-muted-foreground mt-2">
          {region === 'AE' 
            ? 'Generate UAE FTA-compliant VAT returns (5% standard rate)' 
            : 'Generate VAT returns for IRD submission (18% standard rate)'}
        </p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background min-w-[160px]"
            >
              <option value="LK">🇱🇰 Sri Lanka (IRD)</option>
              <option value="AE">🇦🇪 UAE (FTA)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('startDate') || 'Start Date'}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('endDate') || 'End Date'}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background" />
          </div>
          <button onClick={generateReport} disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            <Calculator size={18} />
            {loading ? 'Generating...' : t('generate') || 'Generate'}
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Region-specific Summary */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe size={20} />
              {report.authority === 'FTA' ? '🇦🇪 UAE FTA VAT Return' : '🇱🇰 IRD VAT Return Summary'}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Standard Rate: {report.summary.standardVatRate}%)
              </span>
            </h2>
            
            {report.authority === 'FTA' ? (
              /* UAE FTA Format */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Standard Rated Supplies (Box 1)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.ftaFormat.box1_standardRatedSupplies, 'AED')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Zero Rated Supplies (Box 2)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.ftaFormat.box2_zeroRatedSupplies, 'AED')}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">Output VAT @ 5% (Box 5)</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(report.ftaFormat.box5_outputVat, 'AED')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Standard Rated Expenses (Box 6)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.ftaFormat.box6_standardRatedExpenses, 'AED')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Zero Rated Expenses (Box 7)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.ftaFormat.box7_zeroRatedExpenses, 'AED')}</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-700 dark:text-orange-300">Input VAT (Box 9)</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(report.ftaFormat.box9_inputVat, 'AED')}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 col-span-2 md:col-span-1">
                  <p className="text-sm text-green-700 dark:text-green-300">Net VAT Due (Box 10)</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(report.ftaFormat.box10_dueVat, 'AED')}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 col-span-2 md:col-span-1">
                  <p className="text-sm text-purple-700 dark:text-purple-300">Refundable VAT (Box 11)</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(report.ftaFormat.box11_refundableVat, 'AED')}</p>
                </div>
              </div>
            ) : (
              /* Sri Lanka IRD Format */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales (Box 1)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.irdFormat.box1_totalSales, 'LKR')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Output VAT (Box 2)</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(report.irdFormat.box2_outputVat, 'LKR')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Purchases (Box 3)</p>
                  <p className="text-xl font-bold">{formatCurrency(report.irdFormat.box3_totalPurchases, 'LKR')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Input VAT (Box 4)</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(report.irdFormat.box4_inputVat, 'LKR')}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">Net VAT Payable (Box 5)</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(report.irdFormat.box5_netVatPayable, 'LKR')}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">VAT Refundable (Box 6)</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(report.irdFormat.box6_vatRefundable, 'LKR')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Invoices breakdown */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold">Output VAT - Sales Invoices ({report.invoices.length})</h3>
              {currencySettings && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowRightLeft size={12} />
                  1 AED = {currencySettings.exchangeRates.AED_LKR} LKR
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Serial</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-center">VAT Rate</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                    <th className="px-4 py-2 text-right">VAT</th>
                    {currencySettings && <th className="px-4 py-2 text-right text-muted-foreground">Converted</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.invoices.map((inv: any, i: number) => (
                    <tr key={i} className={inv.isZeroRated ? 'bg-gray-50 dark:bg-gray-900/20' : ''}>
                      <td className="px-4 py-2">{inv.serialNumber}</td>
                      <td className="px-4 py-2">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{inv.client}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${inv.isZeroRated ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                          {inv.vatRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(inv.subtotal || 0, inv.currency)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(inv.vatAmount || 0, inv.currency)}</td>
                      {currencySettings && (
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {inv.currency !== report.currency && (
                            <>{currencySymbol(report.currency)} {inv.convertedTotal?.toLocaleString()}</>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses breakdown */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Input VAT - Expenses ({report.expenses.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Serial</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Vendor</th>
                    <th className="px-4 py-2 text-center">VAT Rate</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">VAT</th>
                    {currencySettings && <th className="px-4 py-2 text-right text-muted-foreground">Converted</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.expenses.map((exp: any, i: number) => (
                    <tr key={i} className={exp.isZeroRated ? 'bg-gray-50 dark:bg-gray-900/20' : ''}>
                      <td className="px-4 py-2">{exp.serialNumber}</td>
                      <td className="px-4 py-2">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{exp.vendor}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${exp.isZeroRated ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                          {exp.vatRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(exp.amount || 0, exp.currency)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(exp.vatAmount || 0, exp.currency)}</td>
                      {currencySettings && (
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {exp.currency !== report.currency && (
                            <>{currencySymbol(report.currency)} {exp.convertedAmount?.toLocaleString()}</>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}