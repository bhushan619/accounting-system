import express from 'express';
import Invoice from '../models/Invoice';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { createInvoiceSchema } from '../validation/invoice';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';

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
  const invoice = await Invoice.findByIdAndDelete(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
