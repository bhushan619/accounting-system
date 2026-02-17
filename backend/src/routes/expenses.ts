import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Expense from '../models/Expense';
import Vendor from '../models/Vendor';
import { requireAuth } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';
import fs from 'fs';
import path from 'path';
import config from '../config';

const router = express.Router();

router.use(requireAuth);

// ── Excel template download ──
router.get('/template', (_req, res) => {
  const headers = [
    'Vendor Name', 'Category', 'Description', 'Amount', 'Currency',
    'Date', 'Payment Method', 'Status'
  ];
  const notesRow: Record<string, any> = {
    'Vendor Name': 'Optional, must match existing vendor',
    'Category': '* Required',
    'Description': '* Required',
    'Amount': '* Required, Number',
    'Currency': 'LKR / AED, Default: LKR',
    'Date': 'YYYY-MM-DD',
    'Payment Method': 'cash / bank / card, Default: cash',
    'Status': 'pending / approved / rejected, Default: pending'
  };
  const sampleRow: Record<string, any> = {
    'Vendor Name': 'Office Supplies Ltd',
    'Category': 'Office',
    'Description': 'Printer Paper',
    'Amount': 5000,
    'Currency': 'LKR',
    'Date': '2026-01-15',
    'Payment Method': 'cash',
    'Status': 'pending'
  };
  const ws = XLSX.utils.json_to_sheet([notesRow, sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=expense-import-template.xlsx');
  res.send(buf);
});

// ── Excel import ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) cb(null, true);
    else cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
  }
});

const EXP_COLUMN_MAP: Record<string, string> = {
  'vendor name': 'vendorName', 'vendorname': 'vendorName', 'vendor': 'vendorName',
  'category': 'category',
  'description': 'description',
  'amount': 'amount',
  'currency': 'currency',
  'date': 'date',
  'payment method': 'paymentMethod', 'paymentmethod': 'paymentMethod',
  'status': 'status'
};

const EXP_VALID_COLUMNS = new Set(Object.keys(EXP_COLUMN_MAP));
const EXP_STATUS_MAP: Record<string, string> = {
  'pending': 'pending', 'approved': 'approved', 'rejected': 'rejected'
};
const PAYMENT_METHOD_MAP: Record<string, string> = {
  'cash': 'cash', 'bank': 'bank', 'card': 'card'
};

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

router.post('/import', upload.single('file'), auditLog('import', 'expense'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    if (rawRows.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    const fileColumns = Object.keys(rawRows[0]).map(c => c.trim().toLowerCase());
    const unmatchedColumns = fileColumns.filter(c => c && !EXP_VALID_COLUMNS.has(c));
    if (unmatchedColumns.length > 0) {
      return res.status(400).json({
        error: `Unrecognized column(s): ${unmatchedColumns.map(c => `"${c}"`).join(', ')}. Please use the provided template.`
      });
    }

    // Cache vendors for lookup
    const vendors = await Vendor.find().lean();
    const vendorMap = new Map(vendors.map(v => [(v.name || '').toLowerCase(), v._id]));

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2;
      const mapped: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        const field = EXP_COLUMN_MAP[key.trim().toLowerCase()];
        if (field) mapped[field] = value;
      }

      if (!mapped.category || !mapped.description || !mapped.amount) {
        results.errors.push(`Row ${rowNum}: Missing required fields (Category, Description, Amount)`);
        results.skipped++; continue;
      }

      // Lookup vendor (optional)
      let vendorId = undefined;
      if (mapped.vendorName) {
        vendorId = vendorMap.get(String(mapped.vendorName).toLowerCase());
        if (!vendorId) {
          results.errors.push(`Row ${rowNum}: Vendor "${mapped.vendorName}" not found`);
          results.skipped++; continue;
        }
      }

      // Validate status
      if (mapped.status) {
        const statusKey = String(mapped.status).trim().toLowerCase();
        if (statusKey in EXP_STATUS_MAP) mapped.status = EXP_STATUS_MAP[statusKey];
        else { results.errors.push(`Row ${rowNum}: Invalid status "${mapped.status}". Use pending/approved/rejected`); results.skipped++; continue; }
      }

      // Validate payment method
      if (mapped.paymentMethod) {
        const pmKey = String(mapped.paymentMethod).trim().toLowerCase();
        if (pmKey in PAYMENT_METHOD_MAP) mapped.paymentMethod = PAYMENT_METHOD_MAP[pmKey];
        else { results.errors.push(`Row ${rowNum}: Invalid payment method "${mapped.paymentMethod}". Use cash/bank/card`); results.skipped++; continue; }
      }

      // Validate currency
      if (mapped.currency && !['LKR', 'AED'].includes(String(mapped.currency).toUpperCase())) {
        results.errors.push(`Row ${rowNum}: Invalid currency "${mapped.currency}". Use LKR or AED`);
        results.skipped++; continue;
      }

      const serialNumber = await getNextSequence('expense', 'EXP');
      const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending_accountant';
      const status = req.user.role === 'admin' ? 'approved' : (mapped.status || 'pending');

      try {
        await Expense.create({
          serialNumber,
          vendor: vendorId,
          category: String(mapped.category),
          description: String(mapped.description),
          amount: Number(mapped.amount) || 0,
          currency: mapped.currency ? String(mapped.currency).toUpperCase() : 'LKR',
          date: parseExcelDate(mapped.date) || new Date(),
          paymentMethod: mapped.paymentMethod || 'cash',
          status,
          approvalStatus,
          createdBy: req.user._id
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${rowNum}: ${err.message}`);
        results.skipped++;
      }
    }
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

router.get('/', async (req, res) => {
  const expenses = await Expense.find()
    .populate('vendor')
    .populate('bank')
    .populate('createdBy', 'email')
    .sort({ date: -1 })
    .lean();
  res.json(expenses);
});

router.get('/:id', async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('vendor')
    .populate('bank')
    .populate('createdBy', 'email');
  if (!expense) return res.status(404).json({ error: 'Not found' });
  res.json(expense);
});

router.post('/', auditLog('create', 'expense'), async (req: any, res) => {
  const serialNumber = await getNextSequence('expense', 'EXP');
  
  // Admin-created expenses are auto-approved, others need approval
  const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending_accountant';
  const status = req.user.role === 'admin' ? 'approved' : 'pending';
  
  // Sanitize empty strings for ObjectId fields
  const body = { ...req.body };
  if (!body.bank) delete body.bank;
  if (!body.vendor) delete body.vendor;
  
  const expense = await Expense.create({
    ...body,
    serialNumber,
    approvalStatus,
    status,
    createdBy: req.user._id
  });
  res.json(expense);
});

router.put('/:id', auditLog('update', 'expense'), async (req: any, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  
  // Delete old file when replacing billUrl or receiptUrl
  const fieldsToCheck = ['billUrl', 'receiptUrl'];
  for (const field of fieldsToCheck) {
    if (req.body[field] && (expense as any)[field] && req.body[field] !== (expense as any)[field]) {
      try {
        const oldPath = path.join(process.cwd(), (expense as any)[field].replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) { console.error(`Failed to delete old ${field}:`, e); }
    }
  }
  
  const isAdmin = req.user.role === 'admin';
  
  // Non-admin users cannot set status to approved/rejected — must go through approval workflow
  if (!isAdmin && (req.body.status === 'approved' || req.body.status === 'rejected')) {
    return res.status(403).json({ error: 'Only admin can approve or reject expenses. Please submit for approval.' });
  }
  
  // If approving expense with bank payment method, update bank balance (admin only)
  if (isAdmin && req.body.status === 'approved' && (req.body.bank || expense.bank)) {
    const bankId = req.body.bank || expense.bank;
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId);
    
    if (bank) {
      bank.balance -= expense.amount;
      bank.updatedAt = new Date();
      await bank.save();
    }
  }
  
  // Strip approvalStatus from non-admin requests to prevent bypassing admin approval
  const { approvalStatus: _ignoredApproval, ...safeBody } = req.body;
  // Sanitize empty strings for ObjectId fields
  if (safeBody.bank === '' || safeBody.bank === null) { safeBody.bank = undefined; }
  if (safeBody.vendor === '' || safeBody.vendor === null) { safeBody.vendor = undefined; }
  const updateData: any = { ...safeBody, updatedAt: new Date() };
  if (isAdmin) {
    if (req.body.status === 'approved' && expense.approvalStatus !== 'approved') {
      updateData.approvalStatus = 'approved';
    } else if (req.body.status === 'rejected' && expense.approvalStatus !== 'rejected') {
      updateData.approvalStatus = 'rejected';
    }
  }

  const updatedExpense = await Expense.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );
  res.json(updatedExpense);
});

router.delete('/:id', auditLog('delete', 'expense'), async (req, res) => {
  // First, fetch the expense to get file URLs
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  
  // Delete associated files
  const filesToDelete = [];
  if (expense.billUrl) filesToDelete.push(expense.billUrl);
  if (expense.receiptUrl) filesToDelete.push(expense.receiptUrl);
  
  for (const fileUrl of filesToDelete) {
    try {
      // fileUrl format: /uploads/bill/timestamp-filename.ext
      const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete file ${fileUrl}:`, error);
    }
  }
  
  // Delete the database record
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
