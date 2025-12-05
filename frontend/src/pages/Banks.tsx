import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Landmark, CreditCard } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
    } catch (error) {
      console.error('Failed to save bank:', error);
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
    } catch (error) {
      console.error('Failed to delete bank:', error);
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

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('banks.title')}</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          {t('banks.addBank')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banks.map((bank) => (
          <div key={bank._id} className="bg-card rounded-lg shadow border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Landmark className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{bank.bankName}</h3>
                  <p className="text-sm text-muted-foreground">{bank.accountName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard size={14} />
                <span className="font-mono">{bank.accountNumber}</span>
              </div>
              {bank.branch && (
                <p className="text-sm text-muted-foreground">{t('banks.branchLabel')}: {bank.branch}</p>
              )}
            </div>

            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('banks.balance')}</p>
              <p className="text-2xl font-bold text-foreground">
                {bank.currency} {bank.balance.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(bank)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                <Edit size={14} />
                {t('common.edit')}
              </button>
              <button
                onClick={() => handleDelete(bank._id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                <Trash2 size={14} />
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Landmark className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {editingBank ? t('banks.editBank') : t('banks.addBank')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('banks.bankName')} *</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('banks.accountName') || 'Account Name'} *</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('banks.accountNumber')} *</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('banks.branch') || 'Branch'}</label>
                <input
                  type="text"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('banks.balance')}</label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  readOnly={!!editingBank}
                />
                {editingBank && (
                  <p className="text-xs text-muted-foreground mt-1">{t('banks.balanceReadonly') || 'Balance is readonly when editing. Update through transactions.'}</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
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
