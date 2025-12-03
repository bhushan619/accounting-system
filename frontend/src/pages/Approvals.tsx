import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Check, X, FileText, Receipt, Clock, AlertCircle } from 'lucide-react';

interface PendingInvoice {
  _id: string;
  serialNumber: string;
  client?: { name: string };
  total: number;
  currency: string;
  approvalStatus: string;
  createdAt: string;
  createdBy?: { email: string; fullName?: string };
}

interface PendingExpense {
  _id: string;
  serialNumber: string;
  vendor?: { name: string };
  category: string;
  amount: number;
  currency: string;
  approvalStatus: string;
  createdAt: string;
  createdBy?: { email: string; fullName?: string };
}

export default function Approvals() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{type: string; id: string} | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/approval/pending`);
      setInvoices(res.data.invoices);
      setExpenses(res.data.expenses);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (type: 'invoice' | 'expense', id: string) => {
    setProcessing(id);
    try {
      const endpoint = user?.role === 'accountant' ? 'approve-accountant' : 'approve-admin';
      await axios.post(`${import.meta.env.VITE_API_URL}/approval/${type}s/${id}/${endpoint}`);
      fetchPendingApprovals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Approval failed');
    }
    setProcessing(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/approval/${rejectModal.type}s/${rejectModal.id}/reject`, {
        reason: rejectReason
      });
      setRejectModal(null);
      setRejectReason('');
      fetchPendingApprovals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Rejection failed');
    }
    setProcessing(null);
  };

  const getApprovalLevel = () => {
    return user?.role === 'accountant' ? t('approvals.accountantLevel') || 'Level 1 (Accountant)' : t('approvals.adminLevel') || 'Level 2 (Admin Final)';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('approvals.title') || 'Pending Approvals'}</h1>
        <p className="text-muted-foreground mt-2">
          {t('approvals.subtitle') || 'Review and approve invoices and expenses'} • {getApprovalLevel()}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Invoices */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <FileText className="text-primary" size={20} />
              <h2 className="text-lg font-semibold">{t('approvals.pendingInvoices') || 'Pending Invoices'}</h2>
              <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {invoices.length}
              </span>
            </div>
            
            {invoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                <Clock size={40} className="mx-auto mb-3 opacity-50" />
                {t('approvals.noInvoices') || 'No invoices pending your approval'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('serial') || 'Serial'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('client') || 'Client'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('amount') || 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('submittedBy') || 'Submitted By'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('date') || 'Date'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{invoice.serialNumber}</td>
                      <td className="px-4 py-3">{invoice.client?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {invoice.currency} {invoice.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{invoice.createdBy?.fullName || invoice.createdBy?.email}</td>
                      <td className="px-4 py-3 text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApprove('invoice', invoice._id)}
                            disabled={processing === invoice._id}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                            title={t('approve') || 'Approve'}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setRejectModal({ type: 'invoice', id: invoice._id })}
                            disabled={processing === invoice._id}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            title={t('reject') || 'Reject'}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pending Expenses */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <Receipt className="text-primary" size={20} />
              <h2 className="text-lg font-semibold">{t('approvals.pendingExpenses') || 'Pending Expenses'}</h2>
              <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {expenses.length}
              </span>
            </div>
            
            {expenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                <Clock size={40} className="mx-auto mb-3 opacity-50" />
                {t('approvals.noExpenses') || 'No expenses pending your approval'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('serial') || 'Serial'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('vendor') || 'Vendor'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('category') || 'Category'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('amount') || 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('submittedBy') || 'Submitted By'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{expense.serialNumber}</td>
                      <td className="px-4 py-3">{expense.vendor?.name || '-'}</td>
                      <td className="px-4 py-3">{expense.category}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {expense.currency} {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{expense.createdBy?.fullName || expense.createdBy?.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApprove('expense', expense._id)}
                            disabled={processing === expense._id}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                            title={t('approve') || 'Approve'}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setRejectModal({ type: 'expense', id: expense._id })}
                            disabled={processing === expense._id}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            title={t('reject') || 'Reject'}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold">{t('approvals.rejectTitle') || 'Reject Item'}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('approvals.rejectDescription') || 'Please provide a reason for rejection:'}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              rows={3}
              placeholder={t('approvals.rejectPlaceholder') || 'Enter rejection reason...'}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {t('reject') || 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
