import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Invoice from '../models/Invoice';
import Client from '../models/Client';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { createInvoiceSchema } from '../validation/invoice';
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
    'Client Name', 'Issue Date', 'Due Date', 'Currency',
    'Item Description', 'Quantity', 'Unit Price',
    'Tax %', 'Discount', 'Notes', 'Status'
  ];
  const notesRow: Record<string, any> = {
    'Client Name': '* Required, must match existing client',
    'Issue Date': 'YYYY-MM-DD',
    'Due Date': 'YYYY-MM-DD',
    'Currency': 'LKR / AED, Default: LKR',
    'Item Description': '* Required',
    'Quantity': '* Required, Number',
    'Unit Price': '* Required, Number',
    'Tax %': 'Number, Default: 0',
    'Discount': 'Number, Default: 0',
    'Notes': 'Optional',
    'Status': 'draft / sent / paid / overdue, Default: draft'
  };
  const sampleRow: Record<string, any> = {
    'Client Name': 'Acme Corp',
    'Issue Date': '2026-01-15',
    'Due Date': '2026-02-15',
    'Currency': 'LKR',
    'Item Description': 'Web Development',
    'Quantity': 1,
    'Unit Price': 50000,
    'Tax %': 0,
    'Discount': 0,
    'Notes': 'Thank you for your business',
    'Status': 'draft'
  };
  const ws = XLSX.utils.json_to_sheet([notesRow, sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=invoice-import-template.xlsx');
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

const INV_COLUMN_MAP: Record<string, string> = {
  'client name': 'clientName', 'clientname': 'clientName', 'client': 'clientName',
  'issue date': 'issueDate', 'issuedate': 'issueDate',
  'due date': 'dueDate', 'duedate': 'dueDate',
  'currency': 'currency',
  'item description': 'itemDescription', 'itemdescription': 'itemDescription', 'description': 'itemDescription',
  'quantity': 'quantity', 'qty': 'quantity',
  'unit price': 'unitPrice', 'unitprice': 'unitPrice', 'price': 'unitPrice',
  'tax %': 'tax', 'tax': 'tax', 'tax%': 'tax',
  'discount': 'discount',
  'notes': 'notes',
  'status': 'status'
};

const INV_VALID_COLUMNS = new Set(Object.keys(INV_COLUMN_MAP));
const INV_STATUS_MAP: Record<string, string> = {
  'draft': 'draft', 'sent': 'sent', 'paid': 'paid', 'overdue': 'overdue'
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

router.post('/import', upload.single('file'), auditLog('import', 'invoice'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    if (rawRows.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    // Validate column headers
    const fileColumns = Object.keys(rawRows[0]).map(c => c.trim().toLowerCase());
    const unmatchedColumns = fileColumns.filter(c => c && !INV_VALID_COLUMNS.has(c));
    if (unmatchedColumns.length > 0) {
      return res.status(400).json({
        error: `Unrecognized column(s): ${unmatchedColumns.map(c => `"${c}"`).join(', ')}. Please use the provided template.`
      });
    }

    // Cache clients for lookup
    const clients = await Client.find().lean();
    const clientMap = new Map(clients.map(c => [(c.name || '').toLowerCase(), c._id]));

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2;
      const mapped: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        const field = INV_COLUMN_MAP[key.trim().toLowerCase()];
        if (field) mapped[field] = value;
      }

      if (!mapped.clientName || !mapped.itemDescription || !mapped.unitPrice) {
        results.errors.push(`Row ${rowNum}: Missing required fields (Client Name, Item Description, Unit Price)`);
        results.skipped++; continue;
      }

      // Lookup client
      const clientId = clientMap.get(String(mapped.clientName).toLowerCase());
      if (!clientId) {
        results.errors.push(`Row ${rowNum}: Client "${mapped.clientName}" not found`);
        results.skipped++; continue;
      }

      // Validate status
      if (mapped.status) {
        const statusKey = String(mapped.status).trim().toLowerCase();
        if (statusKey in INV_STATUS_MAP) mapped.status = INV_STATUS_MAP[statusKey];
        else { results.errors.push(`Row ${rowNum}: Invalid status "${mapped.status}". Use draft/sent/paid/overdue`); results.skipped++; continue; }
      }

      // Validate currency
      if (mapped.currency && !['LKR', 'AED', 'CNY'].includes(String(mapped.currency).toUpperCase())) {
        results.errors.push(`Row ${rowNum}: Invalid currency "${mapped.currency}". Use LKR, AED, or CNY`);
        results.skipped++; continue;
      }

      const quantity = Number(mapped.quantity) || 1;
      const unitPrice = Number(mapped.unitPrice) || 0;
      const tax = Number(mapped.tax) || 0;
      const discount = Number(mapped.discount) || 0;
      const subtotal = quantity * unitPrice;
      const total = subtotal + (subtotal * tax / 100) - discount;

      const serialNumber = await getNextSequence('invoice', 'INV');
      const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending_accountant';

      try {
        await Invoice.create({
          serialNumber,
          client: clientId,
          issueDate: parseExcelDate(mapped.issueDate) || new Date(),
          dueDate: mapped.dueDate ? parseExcelDate(mapped.dueDate) : undefined,
          currency: mapped.currency ? String(mapped.currency).toUpperCase() : 'LKR',
          lines: [{ description: String(mapped.itemDescription), quantity, unitPrice }],
          subtotal,
          tax,
          discount,
          total,
          notes: mapped.notes || '',
          status: mapped.status || 'draft',
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
  const invoices = await Invoice.find()
    .populate('client')
    .populate('bank')
    .populate('createdBy', 'email')
    .sort({ createdAt: -1 })
    .lean();
  res.json(invoices);
});

router.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('client')
    .populate('bank')
    .populate('createdBy', 'email');
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});

router.post('/', validateRequest(createInvoiceSchema), auditLog('create', 'invoice'), async (req: any, res) => {
  const { lines, tax, discount, ...rest } = req.body;
  
  const subtotal = lines.reduce((sum: number, line: any) => 
    sum + (line.quantity * line.unitPrice), 0);
  
  const total = subtotal + (subtotal * tax / 100) - discount;
  
  const serialNumber = await getNextSequence('invoice', 'INV');
  
  // Admin-created invoices are auto-approved, others need approval
  const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending_accountant';
  
  const invoice = await Invoice.create({
    ...rest,
    lines,
    serialNumber,
    subtotal,
    tax,
    discount,
    total,
    approvalStatus,
    createdBy: req.user._id
  });
  
  res.json(invoice);
});

// Allow partial updates (e.g., status only)
router.patch('/:id', auditLog('update', 'invoice'), async (req: any, res) => {
  const { bankId, approvalStatus: _ignoredApproval, ...updateData } = req.body;
  const isAdmin = req.user.role === 'admin';
  
  // Delete old file when replacing attachmentUrl or receiptUrl
  const invoice = await Invoice.findById(req.params.id);
  if (invoice) {
    const fieldsToCheck = ['attachmentUrl', 'receiptUrl'];
    for (const field of fieldsToCheck) {
      if (updateData[field] && (invoice as any)[field] && updateData[field] !== (invoice as any)[field]) {
        try {
          const oldPath = path.join(process.cwd(), (invoice as any)[field].replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) { console.error(`Failed to delete old ${field}:`, e); }
      }
    }
  }
  
  // Non-admin users cannot mark invoices as paid — must go through approval workflow
  if (!isAdmin && updateData.status === 'paid') {
    return res.status(403).json({ error: 'Only admin can mark invoices as paid. Please submit for approval.' });
  }
  
  // If marking as paid and bank is provided, update bank balance and save bank reference (admin only)
  if (isAdmin && updateData.status === 'paid' && bankId) {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId);
    if (!bank) return res.status(404).json({ error: 'Bank not found' });
    
    bank.balance += invoice.total;
    bank.updatedAt = new Date();
    await bank.save();
    
    updateData.bank = bankId;
  }
  
  // Sync approvalStatus for admin status changes
  if (isAdmin && updateData.status === 'paid') {
    updateData.approvalStatus = 'approved';
  }
  
  const updated = await Invoice.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedAt: new Date() },
    { new: true }
  );
  
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.put('/:id', validateRequest(createInvoiceSchema), auditLog('update', 'invoice'), async (req: any, res) => {
  const { lines, tax, discount, ...rest } = req.body;
  
  const subtotal = lines.reduce((sum: number, line: any) => 
    sum + (line.quantity * line.unitPrice), 0);
  
  const total = subtotal + (subtotal * tax / 100) - discount;
  
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { ...rest, lines, subtotal, tax, discount, total, updatedAt: new Date() },
    { new: true }
  );
  
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});

router.delete('/:id', auditLog('delete', 'invoice'), async (req, res) => {
  // First, fetch the invoice to get file URLs
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  
  // Delete associated files
  const filesToDelete = [];
  if (invoice.attachmentUrl) filesToDelete.push(invoice.attachmentUrl);
  if (invoice.receiptUrl) filesToDelete.push(invoice.receiptUrl);
  
  for (const fileUrl of filesToDelete) {
    try {
      // fileUrl format: /uploads/invoice/timestamp-filename.ext
      const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete file ${fileUrl}:`, error);
    }
  }
  
  // Delete the database record
  await Invoice.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
