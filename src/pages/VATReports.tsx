import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { FileSpreadsheet, Download, Calculator } from 'lucide-react';

export default function VATReports() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) return alert('Please select date range');
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/vat-reports/vat-return`, {
        params: { startDate, endDate }
      });
      setReport(res.data);
    } catch (error) {
      console.error('Error generating VAT report:', error);
      alert('Failed to generate report');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('vatReports.title') || 'VAT Returns'}</h1>
        <p className="text-muted-foreground mt-2">{t('vatReports.subtitle') || 'Generate VAT returns for IRD submission'}</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
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
          {/* IRD Format Summary */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet size={20} /> IRD VAT Return Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Sales (Box 1)</p>
                <p className="text-xl font-bold">LKR {report.irdFormat.box1_totalSales.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Output VAT (Box 2)</p>
                <p className="text-xl font-bold text-blue-600">LKR {report.irdFormat.box2_outputVat.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Purchases (Box 3)</p>
                <p className="text-xl font-bold">LKR {report.irdFormat.box3_totalPurchases.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Input VAT (Box 4)</p>
                <p className="text-xl font-bold text-orange-600">LKR {report.irdFormat.box4_inputVat.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">Net VAT Payable (Box 5)</p>
                <p className="text-xl font-bold text-green-700">LKR {report.irdFormat.box5_netVatPayable.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">VAT Refundable (Box 6)</p>
                <p className="text-xl font-bold text-blue-700">LKR {report.irdFormat.box6_vatRefundable.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Invoices breakdown */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Output VAT - Sales Invoices ({report.invoices.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Serial</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                  <th className="px-4 py-2 text-right">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.invoices.map((inv: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{inv.serialNumber}</td>
                    <td className="px-4 py-2">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{inv.client}</td>
                    <td className="px-4 py-2 text-right">{inv.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{inv.vatAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expenses breakdown */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Input VAT - Expenses ({report.expenses.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Serial</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Vendor</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.expenses.map((exp: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{exp.serialNumber}</td>
                    <td className="px-4 py-2">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{exp.vendor}</td>
                    <td className="px-4 py-2 text-right">{exp.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{exp.vatAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
