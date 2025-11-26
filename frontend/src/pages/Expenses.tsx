import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Receipt, Upload, FileDown } from 'lucide-react';

interface Expense {
  _id: string;
  serialNumber: string;
  vendor?: { _id: string; name: string };
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  status: string;
  billUrl?: string;
  receiptUrl?: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: string, status: string, expense: Expense} | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    description: '',
    amount: 0,
    currency: 'LKR',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    bank: '',
    status: 'pending',
    billUrl: '',
    receiptUrl: ''
  });
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingForId, setUploadingForId] = useState<{id: string, type: 'bill' | 'receipt'} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [expensesRes, vendorsRes, banksRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/expenses`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/vendors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/banks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setExpenses(expensesRes.data);
      setVendors(vendorsRes.data);
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
      await axios.post(`${import.meta.env.VITE_API_URL}/expenses`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const expense = expenses.find(exp => exp._id === id);
    if (!expense) return;
    
    // If approving and payment method is bank, need to select bank account
    if (newStatus === 'approved' && expense.paymentMethod === 'bank') {
      // Check if expense already has a bank assigned
      const expenseDetail = await axios.get(`${import.meta.env.VITE_API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!expenseDetail.data.bank) {
        setPendingStatusChange({ id, status: newStatus, expense });
        setShowBankModal(true);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${id}`, 
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
      await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${pendingStatusChange.id}`, 
        { status: pendingStatusChange.status, bank: selectedBank },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowBankModal(false);
      setPendingStatusChange(null);
      setSelectedBank('');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update expense status');
    }
  };

  const handleFileUpload = async (file: File, type: 'bill' | 'receipt', expenseId?: string) => {
    const setUploading = type === 'bill' ? setUploadingBill : setUploadingReceipt;
    setUploading(true);
    if (expenseId) {
      setUploadingForId({ id: expenseId, type });
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
      
      if (expenseId) {
        // Update existing expense with file URL
        const updateData = type === 'bill' ? { billUrl: res.data.url } : { receiptUrl: res.data.url };
        await axios.put(`${import.meta.env.VITE_API_URL}/expenses/${expenseId}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadData();
      } else {
        // Update form data for new expense
        if (type === 'bill') {
          setFormData({ ...formData, billUrl: res.data.url });
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
      vendor: '',
      category: '',
      description: '',
      amount: 0,
      currency: 'LKR',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      bank: '',
      status: 'pending',
      billUrl: '',
      receiptUrl: ''
    });
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expense #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Vendor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Files</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((expense) => (
              <tr key={expense._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{expense.serialNumber}</td>
                <td className="px-6 py-4 text-sm text-foreground">{expense.vendor?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{expense.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground font-medium">
                  {expense.currency} {expense.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={expense.status}
                    onChange={(e) => handleStatusChange(expense._id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(expense.status)}`}
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    {expense.billUrl ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL}${expense.billUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        title="View Bill"
                      >
                        <FileDown size={14} />
                        Bill
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                        <Upload size={14} />
                        {uploadingForId?.id === expense._id && uploadingForId?.type === 'bill' ? 'Uploading...' : 'Bill'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill', expense._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === expense._id && uploadingForId?.type === 'bill'}
                        />
                      </label>
                    )}
                    {expense.receiptUrl ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL}${expense.receiptUrl}`}
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
                        {uploadingForId?.id === expense._id && uploadingForId?.type === 'receipt' ? 'Uploading...' : 'Receipt'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'receipt', expense._id)}
                          className="hidden"
                          disabled={uploadingForId?.id === expense._id && uploadingForId?.type === 'receipt'}
                        />
                      </label>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleDelete(expense._id)}
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
        {expenses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No expenses found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Add New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Vendor</label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
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
                  <label className="block text-sm font-medium mb-1 text-foreground">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                {formData.paymentMethod === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Bank Account</label>
                    <select
                      value={formData.bank}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Select bank</option>
                      {banks.map((bank) => (
                        <option key={bank._id} value={bank._id}>{bank.accountName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Bill Document</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer">
                      <Upload size={16} />
                      {uploadingBill ? 'Uploading...' : 'Upload Bill'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill')}
                        className="hidden"
                        disabled={uploadingBill}
                      />
                    </label>
                    {formData.billUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${formData.billUrl}`}
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
                  Create Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Selection Modal */}
      {showBankModal && pendingStatusChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 m-4 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Bank Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Which bank account paid the expense of {pendingStatusChange.expense.currency} {pendingStatusChange.expense.amount.toLocaleString()}?
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
