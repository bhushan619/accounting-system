import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TaxBracket {
  minIncome: number;
  maxIncome?: number;
  rate: number;
}

interface TaxConfig {
  _id: string;
  name: string;
  taxType: 'apit' | 'epf_employee' | 'epf_employer' | 'etf' | 'stamp_fee' | 'vat' | 'income' | 'withholding';
  rate?: number;
  brackets?: TaxBracket[];
  applicableFrom: string;
  applicableTo?: string;
  isActive: boolean;
}

export default function TaxConfigurations() {
  const { t } = useLanguage();
  const [configs, setConfigs] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TaxConfig | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxType: 'epf_employee' as TaxConfig['taxType'],
    rate: 0,
    applicableFrom: new Date().toISOString().split('T')[0],
    applicableTo: '',
    isActive: true
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxconfig`);
      setConfigs(response.data);
    } catch (error) {
      console.error('Error fetching tax configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will create default Sri Lankan tax configurations. Continue?')) return;
    setSeeding(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/taxconfig/seed`);
      alert('Tax configurations seeded successfully!');
      fetchConfigs();
    } catch (error: any) {
      console.error('Error seeding configs:', error);
      alert(error.response?.data?.error || 'Failed to seed configurations');
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/taxconfig/${editingConfig._id}`,
          formData
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/taxconfig`,
          formData
        );
      }
      fetchConfigs();
      resetForm();
    } catch (error) {
      console.error('Error saving tax config:', error);
    }
  };

  const handleEdit = (config: TaxConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      taxType: config.taxType,
      rate: config.rate || 0,
      applicableFrom: config.applicableFrom.split('T')[0],
      applicableTo: config.applicableTo ? config.applicableTo.split('T')[0] : '',
      isActive: config.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/taxconfig/${id}`);
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting tax config:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      taxType: 'epf_employee',
      rate: 0,
      applicableFrom: new Date().toISOString().split('T')[0],
      applicableTo: '',
      isActive: true
    });
    setEditingConfig(null);
    setShowModal(false);
  };

  const formatTaxType = (type: string) => {
    const types: Record<string, string> = {
      'apit': 'APIT',
      'epf_employee': 'EPF Employee',
      'epf_employer': 'EPF Employer',
      'etf': 'ETF',
      'stamp_fee': 'Stamp Fee',
      'vat': 'VAT',
      'income': 'Income Tax',
      'withholding': 'Withholding Tax'
    };
    return types[type] || type;
  };

  if (loading) return <div className="text-foreground">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="text-primary" />
          {t('taxConfig.title')}
        </h1>
        <div className="flex gap-2">
          {configs.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Download size={20} />
              {seeding ? t('taxConfig.seeding') : t('taxConfig.seedDefault')}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            {t('taxConfig.addConfig')}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('common.name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('taxConfig.type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('taxConfig.from')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('taxConfig.to')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('common.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {configs.map((config) => (
              <tr key={config._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm text-foreground">{config.name}</td>
                <td className="px-6 py-4 text-sm text-foreground">{formatTaxType(config.taxType)}</td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {new Date(config.applicableFrom).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {config.applicableTo ? new Date(config.applicableTo).toLocaleDateString() : 'Ongoing'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {config.isActive ? t('taxConfig.active') : t('taxConfig.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(config)} className="text-primary hover:text-primary/80">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(config._id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {configs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('taxConfig.noConfigs')}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-foreground">
              {editingConfig ? t('taxConfig.editConfig') : t('taxConfig.addConfig')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('common.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('taxConfig.taxType')}</label>
                <select
                  value={formData.taxType}
                  onChange={(e) => setFormData({ ...formData, taxType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  disabled={!!editingConfig && editingConfig.taxType === 'apit'}
                >
                  <option value="epf_employee">EPF Employee</option>
                  <option value="epf_employer">EPF Employer</option>
                  <option value="etf">ETF</option>
                  <option value="stamp_fee">Stamp Fee</option>
                  <option value="vat">VAT</option>
                  <option value="income">Income Tax</option>
                  <option value="withholding">Withholding Tax</option>
                </select>
                {editingConfig?.taxType === 'apit' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    APIT brackets cannot be edited through this form. Please delete and reseed if needed.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('taxConfig.rate')} {formData.taxType === 'stamp_fee' ? '(LKR)' : '(%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('taxConfig.applicableFrom')}</label>
                <input
                  type="date"
                  value={formData.applicableFrom}
                  onChange={(e) => setFormData({ ...formData, applicableFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('taxConfig.applicableTo')}</label>
                <input
                  type="date"
                  value={formData.applicableTo}
                  onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-foreground">{t('taxConfig.active')}</label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90">
                  {editingConfig ? t('common.edit') : t('common.add')}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-muted text-foreground py-2 rounded-lg hover:bg-muted/80">
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
