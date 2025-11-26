import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, FileText, Eye, Upload, FileDown, Receipt } from 'lucide-react';

interface Invoice {
  _id: string;
  serialNumber: string;
  client: { _id: string; name: string };
  issueDate: string;
  dueDate?: string;
  total: number;
  currency: string;
  status: string;
  attachmentUrl?: string;
  receiptUrl?: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: string, status: string, amount: number} | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [formData, setFormData] = useState({
    client: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'LKR',
    lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    tax: 0,
    discount: 0,
    notes: '',
    status: 'draft',
    attachmentUrl: '',
    receiptUrl: ''
  });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingForId, setUploadingForId] = useState<{id: string, type: 'invoice' | 'receipt'} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [invoicesRes, clientsRes, banksRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/banks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
      setBanks(banksRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/invoices`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // If changing to "paid", show bank selection modal
    if (newStatus === 'paid') {
      const invoice = invoices.find(inv => inv._id === id);
      if (invoice) {
        setPendingStatusChange({ id, status: newStatus, amount: invoice.total });
        setShowBankModal(true);
        return;
      }
    }
    
    // For other status changes, proceed normally
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/invoices/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const confirmBankUpdate = async () => {
    if (!selectedBank || !pendingStatusChange) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/invoices/${pendingStatusChange.id}`, 
        { status: pendingStatusChange.status, bankId: selectedBank },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowBankModal(false);
      setPendingStatusChange(null);
      setSelectedBank('');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update invoice status');
    }
  };

  const handleViewInvoice = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewInvoice(res.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const handleFileUpload = async (file: File, type: 'invoice' | 'receipt', invoiceId?: string) => {
    const setUploading = type === 'invoice' ? setUploadingInvoice : setUploadingReceipt;
    setUploading(true);
    if (invoiceId) {
      setUploadingForId({ id: invoiceId, type });
    }
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/uploads/${type}`, formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (invoiceId) {
        // Update existing invoice with file URL
        const updateData = type === 'invoice' ? { attachmentUrl: res.data.url } : { receiptUrl: res.data.url };
        await axios.patch(`${import.meta.env.VITE_API_URL}/invoices/${invoiceId}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadData();
      } else {
        // Update form data for new invoice
        if (type === 'invoice') {
          setFormData({ ...formData, attachmentUrl: res.data.url });
        } else {
          setFormData({ ...formData, receiptUrl: res.data.url });
        }
      }
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      alert(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
      setUploadingForId(null);
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
      status: 'draft',
      attachmentUrl: '',
      receiptUrl: ''
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Files</th>
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
                  <select
                    value={invoice.status}
                    onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(invoice.status)}`}
                  >
                    <option value="draft">draft</option>
                    <option value="sent">sent</option>
                    <option value="paid">paid</option>
                    <option value="overdue">overdue</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    {invoice.attachmentUrl ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL}${invoice.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        title="View Invoice"
                      >
                        <FileText size={14} />
                        Invoice
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                        <Upload size={14} />
                        {uploadingForId?.id === invoice._id && uploadingForId?.type === 'invoice' ? 'Uploading...' : 'Invoice'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'invoice', invoice._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === invoice._id && uploadingForId?.type === 'invoice'}
                        />
                      </label>
                    )}
                    {invoice.receiptUrl ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL}${invoice.receiptUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        title="View Receipt"
                      >
                        <Receipt size={14} />
                        Receipt
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                        <Upload size={14} />
                        {uploadingForId?.id === invoice._id && uploadingForId?.type === 'receipt' ? 'Uploading...' : 'Receipt'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt', invoice._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === invoice._id && uploadingForId?.type === 'receipt'}
                        />
                      </label>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleViewInvoice(invoice._id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Invoice Document</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer">
                      <Upload size={16} />
                      {uploadingInvoice ? 'Uploading...' : 'Upload Invoice'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'invoice')}
                        className="hidden"
                        disabled={uploadingInvoice}
                      />
                    </label>
                    {formData.attachmentUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${formData.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileDown size={14} />
                        View
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Receipt</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer">
                      <Upload size={16} />
                      {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt')}
                        className="hidden"
                        disabled={uploadingReceipt}
                      />
                    </label>
                    {formData.receiptUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${formData.receiptUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileDown size={14} />
                        View
                      </a>
                    )}
                  </div>
                </div>
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

      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Invoice Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium text-foreground">{viewInvoice.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium text-foreground">{viewInvoice.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium text-foreground">{new Date(viewInvoice.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium text-foreground">
                    {viewInvoice.dueDate ? new Date(viewInvoice.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewInvoice.status)}`}>
                    {viewInvoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium text-foreground">{viewInvoice.currency}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Line Items</p>
                <table className="w-full border border-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm text-foreground">Description</th>
                      <th className="px-4 py-2 text-right text-sm text-foreground">Qty</th>
                      <th className="px-4 py-2 text-right text-sm text-foreground">Price</th>
                      <th className="px-4 py-2 text-right text-sm text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.lines?.map((line: any, idx: number) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-4 py-2 text-sm text-foreground">{line.description}</td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">{line.quantity}</td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">{line.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">
                          {(line.quantity * line.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{viewInvoice.currency} {viewInvoice.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Tax ({viewInvoice.tax}%)</span>
                  <span className="font-medium text-foreground">
                    {viewInvoice.currency} {((viewInvoice.subtotal * viewInvoice.tax) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Discount</span>
                  <span className="font-medium text-foreground">{viewInvoice.currency} {viewInvoice.discount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{viewInvoice.currency} {viewInvoice.total?.toLocaleString()}</span>
                </div>
              </div>

              {viewInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{viewInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Selection Modal */}
      {showBankModal && pendingStatusChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Bank Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Which bank account received the payment of {invoices.find(inv => inv._id === pendingStatusChange.id)?.currency} {pendingStatusChange.amount.toLocaleString()}?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Bank Account</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                >
                  <option value="">Select bank account</option>
                  {banks.map((bank) => (
                    <option key={bank._id} value={bank._id}>
                      {bank.name} - {bank.accountNumber} ({bank.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBankModal(false);
                    setPendingStatusChange(null);
                    setSelectedBank('');
                  }}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBankUpdate}
                  disabled={!selectedBank}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
