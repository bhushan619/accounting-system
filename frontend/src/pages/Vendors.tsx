import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Building2, Phone, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
}

export default function Vendors() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: ''
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await axios.put(`${import.meta.env.VITE_API_URL}/vendors/${editingVendor._id}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/vendors`, formData);
      }
      setShowModal(false);
      resetForm();
      loadVendors();
    } catch (error) {
      console.error('Failed to save vendor:', error);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      taxId: vendor.taxId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/vendors/${id}`);
      loadVendors();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
    }
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({ name: '', email: '', phone: '', address: '', taxId: '' });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('vendors.title')}</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          {t('vendors.addVendor')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor._id} className="bg-card rounded-lg shadow border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                  {vendor.taxId && (
                    <p className="text-xs text-muted-foreground">{t('vendors.taxId') || 'Tax ID'}: {vendor.taxId}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {vendor.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={14} />
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} />
                  {vendor.phone}
                </div>
              )}
              {vendor.address && (
                <p className="text-sm text-muted-foreground">{vendor.address}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(vendor)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                <Edit size={14} />
                {t('common.edit')}
              </button>
              <button
                onClick={() => handleDelete(vendor._id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                <Trash2 size={14} />
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Building2 className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {editingVendor ? t('vendors.editVendor') : t('vendors.addVendor')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('common.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('common.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('common.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('common.address')}</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('vendors.taxId') || 'Tax ID'}</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
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
                  {editingVendor ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
