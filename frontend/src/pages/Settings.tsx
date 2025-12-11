import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

interface TaxConfig {
  _id: string;
  name: string;
  taxType: 'vat' | 'income' | 'withholding';
  rate: number;
  applicableFrom: string;
  applicableTo?: string;
  isActive: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'tax'>('account');
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    taxType: 'vat' as 'vat' | 'income' | 'withholding',
    rate: 0,
    applicableFrom: new Date().toISOString().split('T')[0],
    applicableTo: '',
    isActive: true
  });

  usePreventSwipe(showModal);

  useEffect(() => {
    if (activeTab === 'tax') {
      loadTaxConfigs();
    }
  }, [activeTab]);

  const loadTaxConfigs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/taxconfig`);
      setTaxConfigs(res.data);
    } catch (error) {
      console.error('Failed to load tax configs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/taxconfig/${editingId}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/taxconfig`, formData);
      }
      loadTaxConfigs();
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save tax config');
    }
  };

  const handleEdit = (config: TaxConfig) => {
    setEditingId(config._id);
    setFormData({
      name: config.name,
      taxType: config.taxType,
      rate: config.rate,
      applicableFrom: config.applicableFrom.split('T')[0],
      applicableTo: config.applicableTo ? config.applicableTo.split('T')[0] : '',
      isActive: config.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tax configuration?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/taxconfig/${id}`);
      loadTaxConfigs();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      taxType: 'vat',
      rate: 0,
      applicableFrom: new Date().toISOString().split('T')[0],
      applicableTo: '',
      isActive: true
    });
    setEditingId(null);
    setShowModal(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>

      <div className="border-b border-border mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Account Information
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('tax')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'tax'
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Tax Configuration
            </button>
          )}
        </div>
      </div>

      {activeTab === 'account' && (
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
          <div className="space-y-2">
            <p className="text-foreground">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p className="text-foreground">
              <span className="font-medium">Role:</span> {user?.role}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'tax' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Tax Configurations</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus size={20} />
              Add Tax Config
            </button>
          </div>

          <div className="bg-card rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {taxConfigs.map((config) => (
                  <tr key={config._id} className="hover:bg-accent/50">
                    <td className="px-6 py-4 text-sm text-foreground">{config.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground capitalize">{config.taxType}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{config.rate}%</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {new Date(config.applicableFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {config.applicableTo ? new Date(config.applicableTo).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-primary hover:text-primary/80 mr-3"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(config._id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {editingId ? 'Edit Tax Config' : 'Add Tax Config'}
                  </h2>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tax Type</label>
                    <select
                      value={formData.taxType}
                      onChange={(e) => setFormData({ ...formData, taxType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="vat">VAT</option>
                      <option value="income">Income Tax</option>
                      <option value="withholding">Withholding Tax</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">From Date</label>
                      <input
                        type="date"
                        required
                        value={formData.applicableFrom}
                        onChange={(e) => setFormData({ ...formData, applicableFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">To Date</label>
                      <input
                        type="date"
                        value={formData.applicableTo}
                        onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-border"
                    />
                    <label className="text-sm text-foreground">Active</label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      {editingId ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
