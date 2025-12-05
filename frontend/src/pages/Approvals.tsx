import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Check, X, FileText, Receipt, Clock, AlertCircle, User } from 'lucide-react';

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

interface ProfileUpdateRequest {
  _id: string;
  employee: { employeeId: string; fullName: string; email: string };
  requestedBy?: { email: string; fullName?: string };
  requestedChanges: Record<string, string>;
  currentValues: Record<string, string>;
  status: string;
  createdAt: string;
}

export default function Approvals() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [profileRequests, setProfileRequests] = useState<ProfileUpdateRequest[]>([]);
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
      setProfileRequests(res.data.profileRequests || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (type: 'invoice' | 'expense' | 'profile-request', id: string) => {
    setProcessing(id);
    try {
      if (type === 'profile-request') {
        await axios.post(`${import.meta.env.VITE_API_URL}/approval/profile-requests/${id}/approve`);
      } else {
        const endpoint = user?.role === 'accountant' ? 'approve-accountant' : 'approve-admin';
        await axios.post(`${import.meta.env.VITE_API_URL}/approval/${type}s/${id}/${endpoint}`);
      }
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
    return user?.role === 'accountant' ? t('approvals.accountantLevel') : t('approvals.adminLevel');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('approvals.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('approvals.subtitle')} • {getApprovalLevel()}
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
              <h2 className="text-lg font-semibold">{t('approvals.pendingInvoices')}</h2>
              <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {invoices.length}
              </span>
            </div>
            
            {invoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                <Clock size={40} className="mx-auto mb-3 opacity-50" />
                {t('approvals.noInvoices')}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('approvals.serial')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('invoices.client')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('common.amount')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('approvals.submittedBy')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('common.date')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.actions')}</th>
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
                            title={t('approvals.approve')}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setRejectModal({ type: 'invoice', id: invoice._id })}
                            disabled={processing === invoice._id}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            title={t('approvals.reject')}
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
              <h2 className="text-lg font-semibold">{t('approvals.pendingExpenses')}</h2>
              <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {expenses.length}
              </span>
            </div>
            
            {expenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                <Clock size={40} className="mx-auto mb-3 opacity-50" />
                {t('approvals.noExpenses')}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('approvals.serial')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('expenses.vendor')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('expenses.category')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('common.amount')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('approvals.submittedBy')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.actions')}</th>
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
                            title={t('approvals.approve')}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setRejectModal({ type: 'expense', id: expense._id })}
                            disabled={processing === expense._id}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            title={t('approvals.reject')}
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

          {/* Pending Profile Update Requests (Admin only) */}
          {user?.role === 'admin' && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <User className="text-primary" size={20} />
                <h2 className="text-lg font-semibold">{t('approvals.profileRequests')}</h2>
                <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {profileRequests.length}
                </span>
              </div>
              
              {profileRequests.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  <Clock size={40} className="mx-auto mb-3 opacity-50" />
                  {t('approvals.noProfileRequests')}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('employees.employeeId')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('users.fullName')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('employeePortal.requestedChanges')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('common.date')}</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profileRequests.map((request) => (
                      <tr key={request._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{request.employee?.employeeId}</td>
                        <td className="px-4 py-3">{request.employee?.fullName}</td>
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
                        <td className="px-4 py-3 text-sm">{new Date(request.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApprove('profile-request', request._id)}
                              disabled={processing === request._id}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                              title={t('approvals.approve')}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => setRejectModal({ type: 'profile-request', id: request._id })}
                              disabled={processing === request._id}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              title={t('approvals.reject')}
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
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold">{t('approvals.rejectTitle')}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('approvals.rejectDescription')}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              rows={3}
              placeholder={t('approvals.rejectPlaceholder')}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {t('approvals.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
