import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Building2, Phone, Mail, Loader2, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

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
  const [searchTerm, setSearchTerm] = useState('');

  usePreventSwipe(showModal);

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
    } catch (error: any) {
      console.error('Failed to save vendor:', error);
      alert(error?.response?.data?.error || 'Failed to save vendor');
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
    } catch (error: any) {
      console.error('Failed to delete vendor:', error);
      alert(error?.response?.data?.error || 'Failed to delete vendor');
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

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="page-title">{t('vendors.title')}</h1>
          <p className="page-description">{t('vendors.description') || 'Manage your vendor information'}</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary btn-md">
          <Plus size={18} />
          <span>{t('vendors.addVendor')}</span>
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
          <Building2 className="text-primary" size={18} />
          <span className="text-sm font-medium text-foreground">{vendors.length} {t('nav.vendors')}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.email')}</th>
                <th>{t('common.phone')}</th>
                <th>{t('vendors.taxId') || 'Tax ID'}</th>
                <th>{t('common.date')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="icon-container icon-primary">
                        <Building2 size={16} />
                      </div>
                      <span className="font-medium text-foreground">{vendor.name}</span>
                    </div>
                  </td>
                  <td>
                    {vendor.email ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail size={14} />
                        <span>{vendor.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td>
                    {vendor.phone ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone size={14} />
                        <span>{vendor.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-muted-foreground">{vendor.taxId || '-'}</td>
                  <td className="text-muted-foreground">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit size={14} />
                        <span>{t('common.edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(vendor._id)}
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
        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto text-muted-foreground mb-3" size={40} />
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
                {editingVendor ? t('vendors.editVendor') : t('vendors.addVendor')}
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
                  <label className="input-label">{t('common.name')} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder={t('vendors.vendorName') || 'Vendor name'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('common.email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="vendor@company.com"
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('common.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="+94 XX XXX XXXX"
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('common.address')}</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('vendors.taxId') || 'Tax ID'}</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="input"
                  />
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