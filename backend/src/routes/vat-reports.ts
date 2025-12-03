import express from 'express';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Generate VAT return report
router.get('/vat-return', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);
  
  // Get VAT-applicable invoices (Output VAT - sales)
  const invoices = await Invoice.find({
    status: 'paid',
    isVatApplicable: true,
    issueDate: { $gte: start, $lte: end }
  }).populate('client', 'name');
  
  // Get VAT-applicable expenses (Input VAT - purchases)
  const expenses = await Expense.find({
    status: 'approved',
    isVatApplicable: true,
    date: { $gte: start, $lte: end }
  }).populate('vendor', 'name');
  
  // Calculate totals
  const outputVat = invoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
  const inputVat = expenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
  const netVatPayable = outputVat - inputVat;
  
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPurchases = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  res.json({
    period: {
      startDate: start,
      endDate: end
    },
    summary: {
      totalSales,
      totalPurchases,
      outputVat,
      inputVat,
      netVatPayable,
      vatRate: 18
    },
    invoices: invoices.map(inv => ({
      serialNumber: inv.serialNumber,
      date: inv.issueDate,
      client: (inv.client as any)?.name || 'N/A',
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      total: inv.total
    })),
    expenses: expenses.map(exp => ({
      serialNumber: exp.serialNumber,
      date: exp.date,
      vendor: (exp.vendor as any)?.name || 'N/A',
      category: exp.category,
      amount: exp.amount,
      vatAmount: exp.vatAmount
    })),
    // IRD Format fields
    irdFormat: {
      box1_totalSales: totalSales,
      box2_outputVat: outputVat,
      box3_totalPurchases: totalPurchases,
      box4_inputVat: inputVat,
      box5_netVatPayable: netVatPayable > 0 ? netVatPayable : 0,
      box6_vatRefundable: netVatPayable < 0 ? Math.abs(netVatPayable) : 0
    }
  });
});

// Get VAT summary for dashboard
router.get('/vat-summary', async (req, res) => {
  const { year, month } = req.query;
  
  let start: Date, end: Date;
  
  if (year && month) {
    start = new Date(Number(year), Number(month) - 1, 1);
    end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
  } else {
    // Current month
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  const [outputVatResult, inputVatResult] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: 'paid',
          isVatApplicable: true,
          issueDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalVat: { $sum: '$vatAmount' },
          totalSales: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]),
    Expense.aggregate([
      {
        $match: {
          status: 'approved',
          isVatApplicable: true,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalVat: { $sum: '$vatAmount' },
          totalPurchases: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);
  
  const outputVat = outputVatResult[0]?.totalVat || 0;
  const inputVat = inputVatResult[0]?.totalVat || 0;
  
  res.json({
    period: { start, end },
    outputVat,
    inputVat,
    netVatPayable: outputVat - inputVat,
    totalSales: outputVatResult[0]?.totalSales || 0,
    totalPurchases: inputVatResult[0]?.totalPurchases || 0,
    invoiceCount: outputVatResult[0]?.count || 0,
    expenseCount: inputVatResult[0]?.count || 0
  });
});

export default router;
