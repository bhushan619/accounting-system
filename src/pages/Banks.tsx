import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Landmark, CreditCard, Loader2, Search, X } from 'lucide-react';
import { CurrencySymbolDisplay } from '../utils/FormattedCurrency';
import { useLanguage } from '../contexts/LanguageContext';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

interface Bank {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  currency: string;
  balance: number;
}

export default function Banks() {
  const { t } = useLanguage();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    currency: 'LKR',
    balance: 0
  });
  const [searchTerm, setSearchTerm] = useState('');

  usePreventSwipe(showModal);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/banks`);
      setBanks(response.data);
    } catch (error) {
      console.error('Failed to load banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBank) {
        await axios.put(`${import.meta.env.VITE_API_URL}/banks/${editingBank._id}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/banks`, formData);
      }
      setShowModal(false);
      resetForm();
      loadBanks();
    } catch (error: any) {
      console.error('Failed to save bank:', error);
      alert(error?.response?.data?.error || 'Failed to save bank');
    }
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      branch: bank.branch || '',
      currency: bank.currency,
      balance: bank.balance
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/banks/${id}`);
      loadBanks();
    } catch (error: any) {
      console.error('Failed to delete bank:', error);
      alert(error?.response?.data?.error || 'Failed to delete bank');
    }
  };

  const resetForm = () => {
    setEditingBank(null);
    setFormData({
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      currency: 'LKR',
      balance: 0
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const filteredBanks = banks.filter(bank =>
    bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{t('banks.title')}</h1>
          <p className="page-description">{t('banks.description') || 'Manage your bank accounts'}</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary btn-md">
          <Plus size={18} />
          <span>{t('banks.addBank')}</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl">
          <Landmark className="text-primary" size={18} />
          <span className="text-sm font-medium text-foreground">{banks.length} {t('nav.banks') || 'Accounts'}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('banks.bankName')}</th>
                <th>{t('banks.accountNumber')}</th>
                <th>{t('banks.branch') || 'Branch'}</th>
                <th className="text-right">{t('banks.balance')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanks.map((bank) => (
                <tr key={bank._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="icon-container icon-primary">
                        <Landmark size={16} />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{bank.bankName}</span>
                        <p className="text-xs text-muted-foreground">{bank.accountName}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard size={14} />
                      <span className="font-mono">{bank.accountNumber}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{bank.branch || '-'}</td>
                  <td className="text-right">
                    <span className={`font-semibold ${bank.balance > 0 ? 'text-green-600' : 'text-foreground'}`}>
                      <CurrencySymbolDisplay currency={bank.currency} /> {bank.balance.toLocaleString()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(bank)}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit size={14} />
                        <span>{t('common.edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(bank._id)}
                        className="btn btn-sm text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                        <span>{t('common.delete')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBanks.length === 0 && (
          <div className="text-center py-12">
            <Landmark className="mx-auto text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingBank ? t('banks.editBank') : t('banks.addBank')}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="input-label">{t('banks.bankName')} *</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('banks.accountName') || 'Account Name'} *</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('banks.accountNumber')} *</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('banks.branch') || 'Branch'}</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('banks.balance')}</label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                    className="input"
                    readOnly={!!editingBank}
                  />
                  {editingBank && (
                    <p className="text-xs text-muted-foreground mt-1">{t('banks.balanceReadonly') || 'Balance is readonly when editing. Update through transactions.'}</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary btn-md">
                  {editingBank ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}