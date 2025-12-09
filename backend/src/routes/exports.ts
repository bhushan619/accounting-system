import express from 'express';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Payroll from '../models/Payroll';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/invoices/csv', async (req, res) => {
  const invoices = await Invoice.find().populate('client').lean();
  
  let csv = 'Serial,Client,Issue Date,Due Date,Subtotal,Tax,Discount,Total,Status\n';
  invoices.forEach(inv => {
    csv += `${inv.serialNumber},"${(inv.client as any)?.name}",${inv.issueDate},${inv.dueDate || ''},${inv.subtotal},${inv.tax},${inv.discount},${inv.total},${inv.status}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
  res.send(csv);
});

router.get('/expenses/csv', async (req, res) => {
  const expenses = await Expense.find().populate('vendor').lean();
  
  let csv = 'Serial,Vendor,Category,Description,Amount,Date,Payment Method,Status\n';
  expenses.forEach(exp => {
    csv += `${exp.serialNumber},"${(exp.vendor as any)?.name || ''}",${exp.category},"${exp.description}",${exp.amount},${exp.date},${exp.paymentMethod},${exp.status}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
  res.send(csv);
});

router.get('/payroll/csv', async (req, res) => {
  const payrolls = await Payroll.find().populate('employee').lean();
  
  let csv = 'Serial,Employee,Month,Year,Basic Salary,Transport Allowance,Performance Salary,Gross,EPF Employee,EPF Employer,ETF,APIT,Stamp Fee,Deductions,Net Salary,Status\n';
  payrolls.forEach(pay => {
    csv += `${pay.serialNumber},"${(pay.employee as any)?.fullName}",${pay.month},${pay.year},${pay.basicSalary},${pay.transportAllowance},${pay.performanceSalary},${pay.grossSalary},${pay.epfEmployee},${pay.epfEmployer},${pay.etf},${pay.apit},${pay.stampFee},${pay.totalDeductions},${pay.netSalary},${pay.status}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=payroll.csv');
  res.send(csv);
});

export default router;
