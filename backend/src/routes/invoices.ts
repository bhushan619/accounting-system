import express from 'express';
import Invoice from '../models/Invoice';
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

router.get('/', async (req, res) => {
  const invoices = await Invoice.find()
    .populate('client')
    .populate('createdBy', 'email')
    .sort({ createdAt: -1 })
    .lean();
  res.json(invoices);
});

router.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('client')
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
  
  const invoice = await Invoice.create({
    ...rest,
    lines,
    serialNumber,
    subtotal,
    tax,
    discount,
    total,
    createdBy: req.user._id
  });
  
  res.json(invoice);
});

// Allow partial updates (e.g., status only)
router.patch('/:id', auditLog('update', 'invoice'), async (req: any, res) => {
  const { bankId, ...updateData } = req.body;
  
  // If marking as paid and bank is provided, update bank balance and save bank reference
  if (updateData.status === 'paid' && bankId) {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId);
    if (!bank) return res.status(404).json({ error: 'Bank not found' });
    
    // Increase bank balance for received payment
    bank.balance += invoice.total;
    bank.updatedAt = new Date();
    await bank.save();
    
    // Save bank reference to invoice
    updateData.bank = bankId;
  }
  
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedAt: new Date() },
    { new: true }
  );
  
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
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
