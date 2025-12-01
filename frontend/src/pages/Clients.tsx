import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Mail, Users, Loader2, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Client {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function Clients() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${import.meta.env.VITE_API_URL}/clients/${editingClient._id}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/clients`, formData);
      }
      setShowModal(false);
      setFormData({ name: '', email: '' });
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, email: client.email });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/clients/${id}`);
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const openNewModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '' });
    setShowModal(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{t('clients.title')}</h1>
          <p className="page-description">{t('clients.description') || 'Manage your client information'}</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary btn-md">
          <Plus size={18} />
          <span>{t('clients.addClient')}</span>
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
          <Users className="text-primary" size={18} />
          <span className="text-sm font-medium text-foreground">{clients.length} {t('nav.clients')}</span>
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
                <th>{t('common.date')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="icon-container icon-primary">
                        <Users size={16} />
                      </div>
                      <span className="font-medium text-foreground">{client.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit size={14} />
                        <span>{t('common.edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(client._id)}
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
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground">
              {searchTerm ? t('common.noData') : t('common.noData')}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingClient ? t('clients.editClient') : t('clients.addClient')}
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
                  <label className="input-label">{t('common.name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder={t('clients.clientName')}
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
                    placeholder="client@company.com"
                    required
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
                  {editingClient ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
