import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  _id: string;
  type: 'income' | 'expense' | 'payroll';
  amount: number;
  category: string;
  description: string;
  date: string;
  reference?: string;
}

export default function Transactions() {
  const { loading: authLoading, token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    if (!authLoading && token) {
      fetchTransactions();
    }
  }, [authLoading, token]);

  const fetchTransactions = async () => {
    try {
      // Fetch invoices, expenses, and payroll to create a unified transaction view
      const [invoicesRes, expensesRes, payrollRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`),
        axios.get(`${import.meta.env.VITE_API_URL}/expenses`),
        axios.get(`${import.meta.env.VITE_API_URL}/payroll`)
      ]);

      const incomeTransactions = invoicesRes.data.map((inv: any) => ({
        _id: inv._id,
        type: 'income',
        amount: inv.total,
        category: 'Invoice',
        description: `Invoice ${inv.invoiceNumber} - ${inv.client?.name || 'Unknown'}`,
        date: inv.issueDate,
        reference: inv.invoiceNumber
      }));

      const expenseTransactions = expensesRes.data
        .filter((exp: any) => exp.category?.toLowerCase() !== 'payroll')
        .map((exp: any) => ({
          _id: exp._id,
          type: 'expense',
          amount: exp.amount,
          category: exp.category,
          description: exp.description || 'Expense',
          date: exp.date,
          reference: exp.receiptNumber
        }));

      const payrollTransactions = payrollRes.data.map((pay: any) => ({
        _id: pay._id,
        type: 'payroll',
        amount: pay.netSalary,
        category: 'Payroll',
        description: `Payroll - ${pay.employee?.fullName || 'Employee'} (${pay.month}/${pay.year})`,
        date: pay.createdAt,
        reference: pay.serialNumber
      }));

      const allTransactions = [...incomeTransactions, ...expenseTransactions, ...payrollTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' || t.type === filter
  );

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayroll = transactions
    .filter(t => t.type === 'payroll')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - (totalExpense + totalPayroll);

  if (loading) return <div className="text-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <Wallet className="text-primary" />
        Transactions
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {totalIncome.toLocaleString()}
              </p>
            </div>
            <ArrowUpRight className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {totalExpense.toLocaleString()}
              </p>
            </div>
            <ArrowDownRight className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Payroll</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {totalPayroll.toLocaleString()}
              </p>
            </div>
            <ArrowDownRight className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {balance.toLocaleString()}
              </p>
            </div>
            <Wallet className={balance >= 0 ? 'text-green-600' : 'text-red-600'} size={32} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow">
        <div className="p-4 border-b border-border flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'income' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'expense' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilter('payroll')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'payroll' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            Payroll
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reference</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction._id} className="hover:bg-accent/50">
                  <td className="px-6 py-4 text-sm text-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`flex items-center gap-1 ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? (
                        <><ArrowUpRight size={16} /> Income</>
                      ) : transaction.type === 'payroll' ? (
                        <><ArrowDownRight size={16} /> Payroll</>
                      ) : (
                        <><ArrowDownRight size={16} /> Expense</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{transaction.category}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{transaction.description}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{transaction.reference || '-'}</td>
                  <td className={`px-6 py-4 text-sm text-right font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'} Rs. {transaction.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
