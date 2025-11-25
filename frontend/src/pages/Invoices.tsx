import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';

interface Invoice {
  _id: string;
  serialNumber: string;
  client: { _id: string; name: string };
  issueDate: string;
  dueDate?: string;
  total: number;
  currency: string;
  status: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'LKR',
    lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    tax: 0,
    discount: 0,
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`)
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/invoices`, formData);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save invoice:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/invoices/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      currency: 'LKR',
      lines: [{ description: '', quantity: 1, unitPrice: 0 }],
      tax: 0,
      discount: 0,
      notes: '',
      status: 'draft'
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const removeLine = (index: number) => {
    setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Invoice #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Client</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{invoice.serialNumber}</td>
                <td className="px-6 py-4 text-sm text-foreground">{invoice.client?.name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground font-medium">
                  {invoice.currency} {invoice.total.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(invoice._id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No invoices found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Create New Invoice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Client</label>
                  <select
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="LKR">LKR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Line Items</label>
                {formData.lines.map((line, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                      className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                    {formData.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm text-primary hover:underline"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Tax (%)</label>
                  <input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Discount</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
