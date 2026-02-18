import { useState, useEffect } from 'react';
import axios from 'axios';
import { CurrencySymbolDisplay } from '../utils/FormattedCurrency';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import { 
  User, FileText, Download, Edit, Check, X, Clock, 
  Phone, Mail, MapPin, CreditCard, Receipt, Plus, Trash2, Upload
} from 'lucide-react';

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  designation?: string;
  department?: string;
  nic?: string;
  epfNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
}

interface Payslip {
  _id: string;
  serialNumber: string;
  month: number;
  year: number;
  basicSalary: number;
  transportAllowance: number;
  performanceSalary: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  stampFee: number;
  deductionAmount: number;
  cashPayment: number;
  totalDeductions: number;
  netSalary: number;
  totalCTC: number;
  status: string;
}

interface UpdateRequest {
  _id: string;
  status: string;
  requestedChanges: any;
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface ExpenseClaim {
  _id: string;
  serialNumber: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receiptUrl?: string;
  status: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

const CLAIM_CATEGORIES = [
  'Travel', 'Meals', 'Office Supplies', 'Communication', 
  'Training', 'Medical', 'Transport', 'Other'
];

export default function EmployeePortal() {
  useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'payslips' | 'requests' | 'expenses'>('profile');
  const [profile, setProfile] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Expense claim form
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimData, setClaimData] = useState({
    category: 'Travel',
    description: '',
    amount: '',
    currency: 'LKR',
    date: new Date().toISOString().split('T')[0]
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/profile`);
        setProfile(res.data);
        setEditData({
          phone: res.data.phone || '',
          address: res.data.address || '',
          email: res.data.email || '',
          bankName: res.data.bankName || '',
          bankAccountNumber: res.data.bankAccountNumber || '',
          bankAccountName: res.data.bankAccountName || '',
          bankBranch: res.data.bankBranch || ''
        });
      } else if (activeTab === 'payslips') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/payslips`);
        setPayslips(res.data);
        // Also load profile for payslip PDF
        if (!profile) {
          const profileRes = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/profile`);
          setProfile(profileRes.data);
        }
      } else if (activeTab === 'requests') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/profile-update-requests`);
        setRequests(res.data);
      } else if (activeTab === 'expenses') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/expense-claims/my-claims`);
        setExpenseClaims(res.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleSubmitUpdateRequest = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/employee-portal/profile-update-request`, editData);
      alert('Update request submitted for admin approval');
      setEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    }
    setSubmitting(false);
  };

  const downloadPayslipPDF = (payslip: Payslip) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYSLIP', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${getMonthName(payslip.month)} ${payslip.year}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Serial: ${payslip.serialNumber}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Divider
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    // Employee Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Details', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const empDetails = [
      ['Name', profile?.fullName || '-'],
      ['Employee ID', profile?.employeeId || '-'],
      ['Designation', profile?.designation || '-'],
      ['NIC', profile?.nic || '-'],
      ['EPF No', profile?.epfNumber || '-'],
    ];
    
    empDetails.forEach(([label, value]) => {
      doc.text(`${label}:`, 25, y);
      doc.text(value, 80, y);
      y += 6;
    });
    y += 5;

    // Divider
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    // Earnings
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Earnings', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const earnings = [
      ['Basic Salary', payslip.basicSalary],
      ['Transport Allowance', payslip.transportAllowance],
      ['Performance Salary', payslip.performanceSalary],
    ];
    
    earnings.forEach(([label, value]) => {
      doc.text(label as string, 25, y);
      doc.text(`LKR ${(value as number).toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
      y += 6;
    });
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Gross Salary', 25, y);
    doc.text(`LKR ${payslip.grossSalary.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
    y += 8;

    // Divider
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    // Deductions
    doc.setFontSize(11);
    doc.text('Deductions', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const deductions = [
      ['EPF (Employee 8%)', payslip.epfEmployee],
      ['APIT', payslip.apit],
      ['Stamp Fee', payslip.stampFee],
    ];
    if (payslip.deductionAmount > 0) {
      deductions.push(['Other Deductions', payslip.deductionAmount]);
    }
    
    deductions.forEach(([label, value]) => {
      doc.text(label as string, 25, y);
      doc.text(`LKR ${(value as number).toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
      y += 6;
    });
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Deductions', 25, y);
    doc.text(`LKR ${payslip.totalDeductions.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
    y += 10;

    // Divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    // Net Salary
    doc.setFontSize(13);
    doc.text('Net Salary', 25, y);
    doc.text(`LKR ${payslip.netSalary.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
    y += 10;

    // Employer Contributions
    y += 5;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Employer Contributions', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('EPF (Employer 12%)', 25, y);
    doc.text(`LKR ${payslip.epfEmployer.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
    y += 6;
    doc.text('ETF (3%)', 25, y);
    doc.text(`LKR ${payslip.etf.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total CTC', 25, y);
    doc.text(`LKR ${payslip.totalCTC.toLocaleString()}`, pageWidth - 25, y, { align: 'right' });

    // Footer
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('This is a computer-generated document. No signature is required.', pageWidth / 2, y, { align: 'center' });

    doc.save(`payslip-${payslip.year}-${String(payslip.month).padStart(2, '0')}-${profile?.employeeId || ''}.pdf`);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', claimData.category);
      formData.append('description', claimData.description);
      formData.append('amount', claimData.amount);
      formData.append('currency', claimData.currency);
      formData.append('date', claimData.date);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/expense-claims`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Expense claim submitted successfully');
      setShowClaimForm(false);
      setClaimData({ category: 'Travel', description: '', amount: '', currency: 'LKR', date: new Date().toISOString().split('T')[0] });
      setReceiptFile(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit claim');
    }
    setSubmitting(false);
  };

  const handleDeleteClaim = async (id: string) => {
    if (!confirm('Delete this expense claim?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/expense-claims/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete claim');
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-600';
      case 'rejected': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-orange-500/20 text-orange-600';
      case 'paid': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('employeePortal.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('employeePortal.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="inline mr-2" size={18} />
          {t('employeePortal.profile')}
        </button>
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'payslips' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="inline mr-2" size={18} />
          {t('employeePortal.payslips')}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'expenses' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="inline mr-2" size={18} />
          {t('employeePortal.expenseClaims')}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'requests' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="inline mr-2" size={18} />
          {t('employeePortal.updateRequests')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Profile Tab */}
          {activeTab === 'profile' && profile && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{t('employeePortal.personalInfo')}</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Edit size={16} />
                    {t('employeePortal.requestUpdate')}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    >
                      <X size={16} />
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSubmitUpdateRequest}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check size={16} />
                      {t('employeePortal.submitRequest')}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('employees.employeeId')}</label>
                  <p className="text-foreground font-medium">{profile.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.fullName')}</label>
                  <p className="text-foreground font-medium">{profile.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('employees.designation')}</label>
                  <p className="text-foreground">{profile.designation || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('employees.department')}</label>
                  <p className="text-foreground">{profile.department || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <Mail className="inline mr-1" size={14} />
                    {t('common.email')}
                  </label>
                  {editMode ? (
                    <input type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  ) : (
                    <p className="text-foreground">{profile.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <Phone className="inline mr-1" size={14} />
                    {t('common.phone')}
                  </label>
                  {editMode ? (
                    <input type="tel" value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  ) : (
                    <p className="text-foreground">{profile.phone || '-'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <MapPin className="inline mr-1" size={14} />
                    {t('common.address')}
                  </label>
                  {editMode ? (
                    <textarea value={editData.address} onChange={(e) => setEditData({...editData, address: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" rows={2} />
                  ) : (
                    <p className="text-foreground">{profile.address || '-'}</p>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  {t('employeePortal.bankDetails')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'bankName', label: t('banks.bankName') },
                    { key: 'bankAccountNumber', label: t('banks.accountNumber') },
                    { key: 'bankAccountName', label: t('banks.accountName') },
                    { key: 'bankBranch', label: t('banks.branch') },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
                      {editMode ? (
                        <input type="text" value={editData[key]} onChange={(e) => setEditData({...editData, [key]: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                      ) : (
                        <p className="text-foreground">{(profile as any)[key] || '-'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payslips Tab */}
          {activeTab === 'payslips' && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('payroll.period')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('payroll.grossSalary')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('payroll.deductions')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('payroll.netSalary')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.status')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {t('employeePortal.noPayslips')}
                      </td>
                    </tr>
                  ) : (
                    payslips.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {getMonthName(payslip.month)} {payslip.year}
                        </td>
                        <td className="px-4 py-3 text-right">LKR {payslip.grossSalary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-destructive">-{payslip.totalDeductions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          LKR {payslip.netSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status)}`}>
                            {payslip.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => downloadPayslipPDF(payslip)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={t('employeePortal.downloadPayslip')}
                          >
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Expense Claims Tab */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('employeePortal.expenseClaims')}
                </h2>
                <button
                  onClick={() => setShowClaimForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <Plus size={18} />
                  {t('employeePortal.newClaim')}
                </button>
              </div>

              {/* New Claim Form Modal */}
              {showClaimForm && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        {t('employeePortal.submitExpenseClaim')}
                      </h3>
                      <button onClick={() => setShowClaimForm(false)} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                      </button>
                    </div>
                    <form onSubmit={handleSubmitClaim} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                        <select
                          value={claimData.category}
                          onChange={(e) => setClaimData({...claimData, category: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          required
                        >
                          {CLAIM_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                        <textarea
                          value={claimData.description}
                          onChange={(e) => setClaimData({...claimData, description: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          rows={2}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={claimData.amount}
                            onChange={(e) => setClaimData({...claimData, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
                          <select
                            value={claimData.currency}
                            onChange={(e) => setClaimData({...claimData, currency: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="LKR">LKR</option>
                            <option value="AED">AED</option>
                            <option value="CNY">CNY</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                        <input
                          type="date"
                          value={claimData.date}
                          onChange={(e) => setClaimData({...claimData, date: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          <Upload className="inline mr-1" size={14} />
                          Receipt (optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF up to 10MB</p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowClaimForm(false)}
                          className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {submitting ? 'Submitting...' : 'Submit Claim'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Claims Table */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('common.date')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.status')}</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenseClaims.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No expense claims yet. Submit your first claim above.
                        </td>
                      </tr>
                    ) : (
                      expenseClaims.map((claim) => (
                        <tr key={claim._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">{new Date(claim.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{claim.category}</td>
                          <td className="px-4 py-3 text-sm max-w-[200px] truncate">{claim.description}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            <CurrencySymbolDisplay currency={claim.currency} /> {claim.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {claim.receiptUrl && (
                                <a
                                  href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${claim.receiptUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="View Receipt"
                                >
                                  <FileText size={16} />
                                </a>
                              )}
                              {claim.status === 'pending' && (
                                <button
                                  onClick={() => handleDeleteClaim(claim._id)}
                                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            {claim.reviewNotes && (
                              <p className="text-xs text-muted-foreground mt-1">{claim.reviewNotes}</p>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Update Requests Tab */}
          {activeTab === 'requests' && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('common.date')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('employeePortal.requestedChanges')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.status')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('employeePortal.reviewNotes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {t('employeePortal.noRequests')}
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="text-sm space-y-1">
                            {Object.entries(request.requestedChanges)
                              .filter(([_, value]) => value)
                              .map(([key, value]) => (
                                <li key={key}>
                                  <span className="text-muted-foreground">{key}:</span> {value as string}
                                </li>
                              ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {request.reviewNotes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
