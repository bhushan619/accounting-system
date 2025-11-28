import express from 'express';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Payroll from '../models/Payroll';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/overview', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Build separate filters for each collection based on their date fields
  const invoiceFilter: any = {};
  const expenseFilter: any = {};
  const payrollFilter: any = {};
  
  if (startDate || endDate) {
    if (startDate || endDate) {
      invoiceFilter.issueDate = {};
      if (startDate) invoiceFilter.issueDate.$gte = new Date(startDate as string);
      if (endDate) invoiceFilter.issueDate.$lte = new Date(endDate as string);
    }
    
    if (startDate || endDate) {
      expenseFilter.date = {};
      if (startDate) expenseFilter.date.$gte = new Date(startDate as string);
      if (endDate) expenseFilter.date.$lte = new Date(endDate as string);
    }
    
    if (startDate || endDate) {
      payrollFilter.createdAt = {};
      if (startDate) payrollFilter.createdAt.$gte = new Date(startDate as string);
      if (endDate) payrollFilter.createdAt.$lte = new Date(endDate as string);
    }
  }
  
  const invoices = await Invoice.find({ ...invoiceFilter, status: 'paid' });
  const expenses = await Expense.find({ ...expenseFilter, status: 'approved' });
  const payrolls = await Payroll.find({ ...payrollFilter, status: 'paid' });
  
  // Separate payroll category expenses
  const payrollExpenses = expenses.filter(exp => exp.category === 'Payroll');
  const regularExpenses = expenses.filter(exp => exp.category !== 'Payroll');
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = regularExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPayroll = payrolls.reduce((sum, pay) => sum + pay.netSalary, 0);
  const totalPayrollExpenses = payrollExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalCosts = totalExpenses + totalPayroll + totalPayrollExpenses;
  const profit = totalRevenue - totalCosts;
  
  res.json({
    totalRevenue,
    totalExpenses,
    totalPayroll: totalPayroll + totalPayrollExpenses,
    totalCosts,
    profit,
    invoiceCount: invoices.length,
    expenseCount: regularExpenses.length,
    payrollCount: payrolls.length + payrollExpenses.length
  });
});

router.get('/profit-loss', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Build separate filters for each collection
  const invoiceFilter: any = {};
  const expenseFilter: any = {};
  const payrollFilter: any = {};
  
  if (startDate || endDate) {
    invoiceFilter.issueDate = {};
    if (startDate) invoiceFilter.issueDate.$gte = new Date(startDate as string);
    if (endDate) invoiceFilter.issueDate.$lte = new Date(endDate as string);
    
    expenseFilter.date = {};
    if (startDate) expenseFilter.date.$gte = new Date(startDate as string);
    if (endDate) expenseFilter.date.$lte = new Date(endDate as string);
    
    payrollFilter.createdAt = {};
    if (startDate) payrollFilter.createdAt.$gte = new Date(startDate as string);
    if (endDate) payrollFilter.createdAt.$lte = new Date(endDate as string);
  }
  
  const invoices = await Invoice.find({ ...invoiceFilter, status: 'paid' }).populate('client');
  const expenses = await Expense.find({ ...expenseFilter, status: 'approved' }).populate('vendor');
  const payrolls = await Payroll.find({ ...payrollFilter, status: 'paid' }).populate('employee');
  
  // Separate expenses: Payroll category goes to payroll section, others to expenses section
  const payrollExpenses = expenses.filter(exp => exp.category === 'Payroll');
  const regularExpenses = expenses.filter(exp => exp.category !== 'Payroll');
  
  res.json({
    revenue: {
      invoices: invoices.map(inv => ({
        id: inv._id,
        client: inv.client,
        description: inv.lines?.[0]?.description || (inv.client as any)?.name || 'Initial Balance',
        amount: inv.total,
        date: inv.issueDate
      })),
      total: invoices.reduce((sum, inv) => sum + inv.total, 0)
    },
    costs: {
      expenses: regularExpenses.map(exp => ({
        id: exp._id,
        vendor: exp.vendor,
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        date: exp.date
      })),
      payroll: payrolls.map(pay => ({
        id: pay._id,
        employee: pay.employee,
        amount: pay.netSalary,
        month: pay.month,
        year: pay.year
      })),
      payrollExpenses: payrollExpenses.map(exp => ({
        id: exp._id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date
      })),
      totalExpenses: regularExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      totalPayroll: payrolls.reduce((sum, pay) => sum + pay.netSalary, 0),
      totalPayrollExpenses: payrollExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    }
  });
});

router.get('/expenses-breakdown', async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter: any = {};
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }
  
  const expenses = await Expense.find({ ...filter, status: 'approved' });
  
  const byCategory = expenses.reduce((acc: any, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = { count: 0, total: 0 };
    }
    acc[exp.category].count++;
    acc[exp.category].total += exp.amount;
    return acc;
  }, {});
  
  res.json({ byCategory });
});

export default router;
