import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowUpRight, ArrowDownRight, Landmark } from 'lucide-react';
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

interface BankTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  description: string;
  date: string;
  reference?: string;
  category: string;
}

const getMonthName = (month: number) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
};

export default function Transactions() {
  const { loading: authLoading, token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'bank'>('transactions');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'payroll'>('all');

  useEffect(() => {
    if (!authLoading && token) {
      fetchTransactions();
    }
  }, [authLoading, token]);

  const fetchTransactions = async () => {
    try {
      // Fetch invoices, expenses, payroll, and banks to create unified views
      const [invoicesRes, expensesRes, payrollRes, banksRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`),
        axios.get(`${import.meta.env.VITE_API_URL}/expenses`),
        axios.get(`${import.meta.env.VITE_API_URL}/payroll`),
        axios.get(`${import.meta.env.VITE_API_URL}/banks`)
      ]);

      const incomeTransactions = invoicesRes.data
        .filter((inv: any) => inv.status === 'paid')
        .map((inv: any) => ({
          _id: inv._id,
          type: 'income',
          amount: inv.total,
          category: 'Invoice',
          description: `Invoice ${inv.invoiceNumber} - ${inv.client?.name || 'Unknown'}`,
          date: inv.issueDate,
          reference: inv.invoiceNumber
        }));

      const expenseTransactions = expensesRes.data
        .filter((exp: any) => exp.status === 'approved')
        .map((exp: any) => ({
          _id: exp._id,
          type: exp.category === 'Payroll' ? 'payroll' : 'expense',
          amount: exp.amount,
          category: exp.category,
          description: exp.description || 'Expense',
          date: exp.date,
          reference: exp.receiptNumber
        }));

      const payrollTransactions = payrollRes.data
        .filter((pay: any) => pay.status === 'paid')
        .map((pay: any) => ({
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

      // Create bank transactions view
      const banks = banksRes.data;
      const bankMap = new Map(banks.map((bank: any) => [bank._id, bank]));

      const bankIncomeTransactions = invoicesRes.data
        .filter((inv: any) => inv.status === 'paid' && inv.bank)
        .map((inv: any) => {
          const bank = inv.bank?._id ? inv.bank : bankMap.get(inv.bank);
          return {
            _id: inv._id,
            type: 'credit' as const,
            amount: inv.total,
            bankName: bank?.bankName || bank?.name || 'Unknown Bank',
            bankAccountNumber: bank?.accountNumber || '-',
            description: `Invoice ${inv.serialNumber || inv.invoiceNumber} - ${inv.client?.name || 'Unknown'}`,
            date: inv.issueDate,
            reference: inv.serialNumber || inv.invoiceNumber,
            category: 'Invoice Payment'
          };
        });

      const bankExpenseTransactions = expensesRes.data
        .filter((exp: any) => exp.status === 'approved' && exp.bank)
        .map((exp: any) => {
          const bank = exp.bank?._id ? exp.bank : bankMap.get(exp.bank);
          return {
            _id: exp._id,
            type: 'debit' as const,
            amount: exp.amount,
            bankName: bank?.bankName || bank?.name || 'Unknown Bank',
            bankAccountNumber: bank?.accountNumber || '-',
            description: exp.description || 'Expense',
            date: exp.date,
            reference: exp.serialNumber,
            category: exp.category || 'Expense'
          };
        });

      const bankPayrollTransactions = payrollRes.data
        .filter((pay: any) => pay.status === 'paid' && pay.bank)
        .map((pay: any) => {
          const bank = pay.bank?._id ? pay.bank : bankMap.get(pay.bank);
          return {
            _id: pay._id,
            type: 'debit' as const,
            amount: pay.netSalary,
            bankName: bank?.bankName || bank?.name || 'Unknown Bank',
            bankAccountNumber: bank?.accountNumber || '-',
            description: `Salary payment - ${pay.employee?.fullName || 'Employee'} (${getMonthName(pay.month)} ${pay.year})`,
            date: pay.createdAt,
            reference: pay.serialNumber,
            category: 'Payroll'
          };
        });

      const allBankTransactions = [...bankIncomeTransactions, ...bankExpenseTransactions, ...bankPayrollTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setBankTransactions(allBankTransactions);
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
        <div className="p-4 border-b border-border">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'transactions' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              <Wallet className="inline mr-2" size={16} />
              All Transactions
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              <Landmark className="inline mr-2" size={16} />
              Bank Transactions
            </button>
          </div>

          {activeTab === 'transactions' && (
            <div className="flex gap-2">
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
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'transactions' ? (
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
          ) : (
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Bank Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reference</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bankTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-accent/50">
                    <td className="px-6 py-4 text-sm text-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className="text-muted-foreground" />
                        <div>
                          <div className="font-medium">{transaction.bankName}</div>
                          <div className="text-xs text-muted-foreground">{transaction.bankAccountNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`flex items-center gap-1 ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? (
                          <><ArrowUpRight size={16} /> Credit</>
                        ) : (
                          <><ArrowDownRight size={16} /> Debit</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{transaction.category}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{transaction.description}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{transaction.reference || '-'}</td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'} Rs. {transaction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
