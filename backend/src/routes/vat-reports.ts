import express from 'express';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Settings from '../models/Settings';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Get currency settings for exchange rates
const getCurrencySettings = async () => {
  const settings = await Settings.findOne({ type: 'currency' });
  return settings?.data || {
    baseCurrency: 'LKR',
    exchangeRates: { LKR_AED: 0.010, AED_LKR: 100.0 },
    vatRates: {
      LK: { standard: 18, zeroRated: 0 },
      AE: { standard: 5, zeroRated: 0 }
    }
  };
};

// Get company region
const getCompanyRegion = async () => {
  const settings = await Settings.findOne({ type: 'company' });
  return settings?.data?.region || 'LK';
};

// Generate VAT return report (supports both LK IRD and UAE FTA formats)
router.get('/vat-return', async (req, res) => {
  const { startDate, endDate, region: queryRegion } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);
  
  const region = (queryRegion as string) || await getCompanyRegion();
  const currencySettings = await getCurrencySettings();
  const vatRates = currencySettings.vatRates[region] || currencySettings.vatRates.LK;
  const baseCurrency = region === 'AE' ? 'AED' : 'LKR';
  
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
  
  // Convert amounts to base currency if needed
  const convertToBase = (amount: number, currency: string) => {
    if (currency === baseCurrency) return amount;
    if (currency === 'LKR' && baseCurrency === 'AED') {
      return amount * currencySettings.exchangeRates.LKR_AED;
    }
    if (currency === 'AED' && baseCurrency === 'LKR') {
      return amount * currencySettings.exchangeRates.AED_LKR;
    }
    return amount;
  };
  
  // Calculate totals with currency conversion
  let outputVat = 0;
  let inputVat = 0;
  let totalSales = 0;
  let totalPurchases = 0;
  let zeroRatedSales = 0;
  let zeroRatedPurchases = 0;
  
  const invoiceDetails = invoices.map(inv => {
    const converted = convertToBase(inv.total, inv.currency);
    const vatConverted = convertToBase(inv.vatAmount || 0, inv.currency);
    const isZeroRated = inv.vatRate === 0;
    
    if (isZeroRated) {
      zeroRatedSales += converted;
    } else {
      outputVat += vatConverted;
      totalSales += converted;
    }
    
    return {
      serialNumber: inv.serialNumber,
      date: inv.issueDate,
      client: (inv.client as any)?.name || 'N/A',
      subtotal: inv.subtotal,
      vatRate: inv.vatRate || vatRates.standard,
      vatAmount: inv.vatAmount,
      total: inv.total,
      currency: inv.currency,
      convertedTotal: converted,
      convertedVat: vatConverted,
      isZeroRated
    };
  });
  
  const expenseDetails = expenses.map(exp => {
    const converted = convertToBase(exp.amount, exp.currency);
    const vatConverted = convertToBase(exp.vatAmount || 0, exp.currency);
    const isZeroRated = exp.vatRate === 0;
    
    if (isZeroRated) {
      zeroRatedPurchases += converted;
    } else {
      inputVat += vatConverted;
      totalPurchases += converted;
    }
    
    return {
      serialNumber: exp.serialNumber,
      date: exp.date,
      vendor: (exp.vendor as any)?.name || 'N/A',
      category: exp.category,
      amount: exp.amount,
      vatRate: exp.vatRate || vatRates.standard,
      vatAmount: exp.vatAmount,
      currency: exp.currency,
      convertedAmount: converted,
      convertedVat: vatConverted,
      isZeroRated
    };
  });
  
  const netVatPayable = outputVat - inputVat;
  
  // Format based on region
  const reportFormat = region === 'AE' ? {
    // UAE FTA Format (Federal Tax Authority)
    ftaFormat: {
      box1_standardRatedSupplies: totalSales,
      box2_zeroRatedSupplies: zeroRatedSales,
      box3_exemptSupplies: 0, // Could add exempt category support
      box4_totalSupplies: totalSales + zeroRatedSales,
      box5_outputVat: outputVat,
      box6_standardRatedExpenses: totalPurchases,
      box7_zeroRatedExpenses: zeroRatedPurchases,
      box8_totalExpenses: totalPurchases + zeroRatedPurchases,
      box9_inputVat: inputVat,
      box10_dueVat: netVatPayable > 0 ? netVatPayable : 0,
      box11_refundableVat: netVatPayable < 0 ? Math.abs(netVatPayable) : 0
    },
    vatRate: vatRates.standard,
    authority: 'FTA',
    authorityName: 'Federal Tax Authority',
    currency: 'AED'
  } : {
    // Sri Lanka IRD Format
    irdFormat: {
      box1_totalSales: totalSales,
      box2_outputVat: outputVat,
      box3_totalPurchases: totalPurchases,
      box4_inputVat: inputVat,
      box5_netVatPayable: netVatPayable > 0 ? netVatPayable : 0,
      box6_vatRefundable: netVatPayable < 0 ? Math.abs(netVatPayable) : 0
    },
    vatRate: vatRates.standard,
    authority: 'IRD',
    authorityName: 'Inland Revenue Department',
    currency: 'LKR'
  };
  
  res.json({
    region,
    period: { startDate: start, endDate: end },
    summary: {
      totalSales,
      totalPurchases,
      zeroRatedSales,
      zeroRatedPurchases,
      outputVat,
      inputVat,
      netVatPayable,
      standardVatRate: vatRates.standard
    },
    invoices: invoiceDetails,
    expenses: expenseDetails,
    ...reportFormat
  });
});

// Get VAT summary for dashboard
router.get('/vat-summary', async (req, res) => {
  const { year, month, region: queryRegion } = req.query;
  
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
  
  const region = (queryRegion as string) || await getCompanyRegion();
  const currencySettings = await getCurrencySettings();
  const vatRates = currencySettings.vatRates[region] || currencySettings.vatRates.LK;
  
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
    region,
    period: { start, end },
    outputVat,
    inputVat,
    netVatPayable: outputVat - inputVat,
    totalSales: outputVatResult[0]?.totalSales || 0,
    totalPurchases: inputVatResult[0]?.totalPurchases || 0,
    invoiceCount: outputVatResult[0]?.count || 0,
    expenseCount: inputVatResult[0]?.count || 0,
    standardVatRate: vatRates.standard
  });
});

export default router;
