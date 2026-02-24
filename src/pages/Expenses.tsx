import { useState, useEffect } from 'react';
import axios from 'axios';
import { CurrencySymbolDisplay } from '../utils/FormattedCurrency';
import { Plus, Trash2, Receipt, Upload, FileDown, Eye, Search, X, Download, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

interface ImportResult { created: number; skipped: number; errors: string[] }

interface Expense {
  _id: string;
  serialNumber: string;
  vendor?: { _id: string; name: string };
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  status: string;
  billUrl?: string;
  receiptUrl?: string;
  isVatApplicable?: boolean;
  vatRate?: number;
  vatCategory?: 'standard' | 'zero_rated';
}

interface CurrencySettings {
  exchangeRates: { LKR_AED: number; AED_LKR: number; LKR_CNY: number; CNY_LKR: number };
  vatRates: { LK: { standard: number }; AE: { standard: number }; [key: string]: { standard: number } };
}

export default function Expenses() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: string, status: string, expense: Expense} | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [companySettings, setCompanySettings] = useState<any>({});
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings | null>(null);
  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    description: '',
    amount: 0,
    currency: 'LKR',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    bank: '',
    status: 'pending',
    billUrl: '',
    receiptUrl: '',
    isVatApplicable: false,
    vatCategory: 'standard' as 'standard' | 'zero_rated'
  });
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingForId, setUploadingForId] = useState<{id: string, type: 'bill' | 'receipt'} | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [filterNumber, setFilterNumber] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  

  const EXPENSE_CATEGORIES = [
    'Office Supplies',
    'Rent & Utilities',
    'Travel & Transport',
    'Meals & Entertainment',
    'Marketing & Advertising',
    'Software & Subscriptions',
    'Equipment & Hardware',
    'Professional Services',
    'Maintenance & Repairs',
    'Insurance',
    'Salaries & Benefits',
    'Training & Education',
    'Bank Charges',
    'Taxes & Licenses',
    'Miscellaneous',
    'Other',
  ];

  const filteredExpenses = expenses.filter(exp => {
    if (filterNumber && !exp.serialNumber.toLowerCase().includes(filterNumber.toLowerCase())) return false;
    if (filterDateFrom && new Date(exp.date) < new Date(filterDateFrom)) return false;
    if (filterDateTo) {
      const end = new Date(filterDateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(exp.date) > end) return false;
    }
    if (filterStatus && exp.status !== filterStatus) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterNumber('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterNumber || filterDateFrom || filterDateTo || filterStatus;

  usePreventSwipe(showModal || showBankModal || !!viewExpense || showImportModal);

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/expenses/template`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expense-import-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', importFile);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/expenses/import`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      if (response.data.created > 0) {
        loadData();
        if (response.data.errors.length === 0) {
          setTimeout(() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportResult(null);
          }, 1500);
        }
      }
    } catch (error: any) {
      setImportResult({ created: 0, skipped: 0, errors: [error.response?.data?.error || 'Import failed'] });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [expensesRes, vendorsRes, banksRes, companyRes, currencyRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/expenses`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/vendors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/banks`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/settings/company`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} })),
        axios.get(`${import.meta.env.VITE_API_URL}/settings/currency`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null }))
      ]);
      setExpenses(expensesRes.data.filter((exp: any) => exp.category !== 'Payroll'));
      setVendors(vendorsRes.data);
      setBanks(banksRes.data);
      setCompanySettings(companyRes.data);
      if (currencyRes.data) setCurrencySettings(currencyRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || formData.category === 'custom') return;
    try {
      const token = localStorage.getItem('token');
      const region = companySettings.region || 'LK';
      const vatRate = formData.vatCategory === 'zero_rated' ? 0 : 
        (currencySettings?.vatRates?.[region]?.standard || (region === 'AE' ? 5 : 18));
      
      await axios.post(`${import.meta.env.VITE_API_URL}/expenses`, {
        ...formData,
        vatRate,
        isVatApplicable: formData.isVatApplicable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      alert(error?.response?.data?.error || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      alert(error?.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const expense = expenses.find(exp => exp._id === id);
    if (!expense) return;
    
    // If approving and payment method is bank, need to select bank account
    if (newStatus === 'approved' && expense.paymentMethod === 'bank') {
      // Check if expense already has a bank assigned
      const expenseDetail = await axios.get(`${import.meta.env.VITE_API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!expenseDetail.data.bank) {
        setPendingStatusChange({ id, status: newStatus, expense });
        setShowBankModal(true);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      const msg = error?.response?.data?.error || 'Failed to update expense status';
      alert(msg);
    }
  };

  const confirmBankUpdate = async () => {
    if (!selectedBank || !pendingStatusChange) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${pendingStatusChange.id}`, 
        { status: pendingStatusChange.status, bank: selectedBank },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowBankModal(false);
      setPendingStatusChange(null);
      setSelectedBank('');
      loadData();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      const msg = error?.response?.data?.error || 'Failed to update expense status';
      alert(msg);
    }
  };

  const handleFileUpload = async (file: File, type: 'bill' | 'receipt', expenseId?: string) => {
    const setUploading = type === 'bill' ? setUploadingBill : setUploadingReceipt;
    setUploading(true);
    if (expenseId) {
      setUploadingForId({ id: expenseId, type });
    }
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/uploads/${type}`, formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (expenseId) {
        // Update existing expense with file URL
        const updateData = type === 'bill' ? { billUrl: res.data.url } : { receiptUrl: res.data.url };
        await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${expenseId}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadData();
      } else {
        // Update form data for new expense
        if (type === 'bill') {
          setFormData(prev => ({ ...prev, billUrl: res.data.url }));
        } else {
          setFormData(prev => ({ ...prev, receiptUrl: res.data.url }));
        }
      }
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      alert(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
      setUploadingForId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      category: '',
      description: '',
      amount: 0,
      currency: 'LKR',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      bank: '',
      status: 'pending',
      billUrl: '',
      receiptUrl: '',
      isVatApplicable: false,
      vatCategory: 'standard'
    });
  };

  const getVatRate = (): number => {
    const region = (companySettings.region || 'LK') as string;
    if (formData.vatCategory === 'zero_rated') return 0;
    return currencySettings?.vatRates?.[region]?.standard ?? (region === 'AE' ? 5 : 18);
  };

  const getConvertedAmount = (amount: number, fromCurrency: string) => {
    if (!currencySettings) return null;
    if (fromCurrency === 'LKR') {
      return { amount: amount * currencySettings.exchangeRates.LKR_AED, currency: 'AED' };
    }
    return { amount: amount * currencySettings.exchangeRates.AED_LKR, currency: 'LKR' };
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{t('expenses.title')}</h1>
          <p className="page-description">{t('expenses.description') || 'Track and manage business expenses'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowImportModal(true); setImportFile(null); setImportResult(null); }}
            className="btn btn-secondary btn-md"
          >
            <Upload size={18} />
            <span>Import Excel</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={18} />
            <span>{t('expenses.addExpense')}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('expenses.expenseNo') || 'Expense #'}</label>
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={filterNumber}
                onChange={(e) => setFilterNumber(e.target.value)}
                placeholder={t('common.search') || 'Search...'}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('taxConfig.from')}</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('taxConfig.to')}</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.status')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">{t('common.all') || 'All'}</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
              {t('common.clear') || 'Clear'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('expenses.expenseNo') || 'Expense #'}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('expenses.vendor')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('expenses.category')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('common.date')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('common.amount')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('common.status')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('expenses.files') || 'Files'}</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredExpenses.map((expense) => (
              <tr key={expense._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{expense.serialNumber}</td>
                <td className="px-6 py-4 text-sm text-foreground">{expense.vendor?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{expense.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <div className="font-medium"><CurrencySymbolDisplay currency={expense.currency} /> {expense.amount.toLocaleString()}</div>
                  {currencySettings && (
                    <div className="text-xs text-muted-foreground">
                      ≈ <CurrencySymbolDisplay currency={getConvertedAmount(expense.amount, expense.currency)?.currency || ''} /> {getConvertedAmount(expense.amount, expense.currency)?.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={expense.status}
                    onChange={(e) => handleStatusChange(expense._id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(expense.status)}`}
                    disabled={!isAdmin && (expense.status === 'approved' || expense.status === 'rejected')}
                  >
                    <option value="pending">pending</option>
                    {isAdmin && <option value="approved">approved</option>}
                    {isAdmin && <option value="rejected">rejected</option>}
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    {expense.billUrl ? (
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`${import.meta.env.VITE_API_URL}${expense.billUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          title="View Bill"
                        >
                          <FileDown size={14} />
                          Bill
                        </a>
                        <label className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary cursor-pointer ml-1" title="Replace Bill">
                          <RefreshCw size={12} />
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill', expense._id)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                        <Upload size={14} />
                        {uploadingForId?.id === expense._id && uploadingForId?.type === 'bill' ? 'Uploading...' : 'Bill'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill', expense._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === expense._id && uploadingForId?.type === 'bill'}
                        />
                      </label>
                    )}
                    {expense.receiptUrl ? (
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`${import.meta.env.VITE_API_URL}${expense.receiptUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          title="View Receipt"
                        >
                          <Receipt size={14} />
                          Receipt
                        </a>
                        <label className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary cursor-pointer ml-1" title="Replace Receipt">
                          <RefreshCw size={12} />
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt', expense._id)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                        <Upload size={14} />
                        {uploadingForId?.id === expense._id && uploadingForId?.type === 'receipt' ? 'Uploading...' : 'Receipt'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt', expense._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === expense._id && uploadingForId?.type === 'receipt'}
                        />
                      </label>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => setViewExpense(expense)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
                    <Eye size={14} />
                    {t('expenses.view') || 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(expense._id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  >
                    <Trash2 size={14} />
                    {t('expenses.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {hasActiveFilters ? (t('common.noResults') || 'No matching results') : t('expenses.noExpenses')}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-2 sm:p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl p-4 sm:p-6 m-0 sm:m-4 border border-border max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-5 text-foreground">{t('expenses.createNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Row 1: Category + Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Category *</label>
                  <select
                    value={EXPENSE_CATEGORIES.includes(formData.category) ? formData.category : (formData.category ? 'custom' : '')}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setFormData({ ...formData, category: 'custom' });
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required={!formData.category}
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Add Custom Category</option>
                  </select>
                  {formData.category === 'custom' || (!EXPENSE_CATEGORIES.includes(formData.category) && formData.category !== '' && formData.category !== 'custom') ? (
                    <input
                      type="text"
                      placeholder="Enter custom category"
                      value={formData.category === 'custom' ? '' : formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value || 'custom' })}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('expenses.vendor')}</label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">{t('expenses.selectVendor')}</option>
                    {vendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="What is this expense for?"
                  required
                />
              </div>

              {/* Row 3: Amount + Currency + Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="LKR">LKR</option>
                    <option value="AED">AED</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Payment Method + Bank Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Bank Account</label>
                  <select
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    disabled={formData.paymentMethod !== 'bank'}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">Select bank</option>
                    {banks.map((bank) => (
                      <option key={bank._id} value={bank._id}>{bank.accountName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: VAT */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isVatApplicable"
                    checked={formData.isVatApplicable}
                    onChange={(e) => setFormData({ ...formData, isVatApplicable: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="isVatApplicable" className="text-sm font-medium cursor-pointer">
                    VAT Applicable ({companySettings.region === 'AE' ? '🇦🇪 UAE' : '🇱🇰 LK'}: {getVatRate()}%)
                  </label>
                  {formData.isVatApplicable && (
                    <select
                      value={formData.vatCategory}
                      onChange={(e) => setFormData({ ...formData, vatCategory: e.target.value as 'standard' | 'zero_rated' })}
                      className="ml-auto px-3 py-1 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value="standard">Standard ({getVatRate()}%)</option>
                      <option value="zero_rated">Zero Rated (0%)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Row 6: File uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Bill Document</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer text-sm">
                      <Upload size={15} />
                      {uploadingBill ? 'Uploading...' : 'Upload Bill'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill')}
                        className="hidden"
                        disabled={uploadingBill}
                      />
                    </label>
                    {formData.billUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${formData.billUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileDown size={14} /> View
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Receipt</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer text-sm">
                      <Upload size={15} />
                      {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt')}
                        className="hidden"
                        disabled={uploadingReceipt}
                      />
                    </label>
                    {formData.receiptUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${formData.receiptUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileDown size={14} /> View
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  Create Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {viewExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Expense Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Expense #</p>
                  <p className="font-medium text-foreground">{viewExpense.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium text-foreground">{viewExpense.vendor?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium text-foreground">{viewExpense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{new Date(viewExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium text-foreground capitalize">{viewExpense.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewExpense.status)}`}>
                    {viewExpense.status}
                  </span>
                </div>
              </div>

              {viewExpense.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-foreground">{viewExpense.description}</p>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Base Amount</span>
                  <span className="font-medium text-foreground"><CurrencySymbolDisplay currency={viewExpense.currency} /> {viewExpense.amount.toLocaleString()}</span>
                </div>
                {viewExpense.isVatApplicable && (
                  <div className="flex justify-between bg-muted/50 p-2 rounded">
                    <span className="text-sm text-muted-foreground">
                      VAT ({viewExpense.vatRate || 0}% - {viewExpense.vatCategory === 'zero_rated' ? 'Zero Rated' : 'Standard'})
                    </span>
                    <span className="font-medium text-foreground">
                      <CurrencySymbolDisplay currency={viewExpense.currency} /> {((viewExpense.amount * (viewExpense.vatRate || 0)) / 100).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                  <span className="text-foreground">Total (inc. VAT)</span>
                  <span className="text-foreground">
                    <CurrencySymbolDisplay currency={viewExpense.currency} /> {(viewExpense.amount + (viewExpense.isVatApplicable ? (viewExpense.amount * (viewExpense.vatRate || 0)) / 100 : 0)).toLocaleString()}
                  </span>
                </div>
                {currencySettings && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Converted</span>
                    <span>
                      ≈ <CurrencySymbolDisplay currency={getConvertedAmount(viewExpense.amount, viewExpense.currency)?.currency || ''} /> {getConvertedAmount(viewExpense.amount, viewExpense.currency)?.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                {viewExpense.billUrl && (
                  <a
                    href={`${import.meta.env.VITE_API_URL}${viewExpense.billUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileDown size={14} />
                    View Bill
                  </a>
                )}
                {viewExpense.receiptUrl && (
                  <a
                    href={`${import.meta.env.VITE_API_URL}${viewExpense.receiptUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Receipt size={14} />
                    View Receipt
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewExpense(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Selection Modal */}
      {showBankModal && pendingStatusChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Bank Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Which bank account paid the expense of <CurrencySymbolDisplay currency={pendingStatusChange.expense.currency} /> {pendingStatusChange.expense.amount.toLocaleString()}?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Bank Account</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                >
                  <option value="">Select bank account</option>
                  {banks.map((bank: any) => (
                    <option key={bank._id} value={bank._id}>
                      {bank.bankName || bank.name} - {bank.accountNumber} ({bank.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBankModal(false);
                    setPendingStatusChange(null);
                    setSelectedBank('');
                  }}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBankUpdate}
                  disabled={!selectedBank}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Import Expenses from Excel</h2>
            <div className="mb-4">
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Download size={16} />
                Download Template (.xlsx)
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">Select Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Supported formats: .xlsx, .xls, .csv (max 5MB)</p>
            </div>
            {importResult && (
              <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50">
                <p className="text-sm font-medium text-foreground mb-1">
                  Import Results: {importResult.created} created, {importResult.skipped} skipped
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80">
                {t('common.cancel')}
              </button>
              <button onClick={handleImport} disabled={!importFile || importing} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {importing && <Loader2 className="animate-spin" size={16} />}
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
