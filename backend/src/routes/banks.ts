import express from 'express';
import Bank from '../models/Bank';
import Invoice from '../models/Invoice';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { getNextSequence } from '../services/counterService';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const banks = await Bank.find().sort({ name: 1 }).lean();
  res.json(banks);
});

router.get('/:id', async (req, res) => {
  const bank = await Bank.findById(req.params.id);
  if (!bank) return res.status(404).json({ error: 'Not found' });
  res.json(bank);
});

router.post('/', auditLog('create', 'bank'), async (req, res) => {
  const bank = await Bank.create(req.body);
  
  // If bank has initial balance, create an income transaction
  if (bank.balance && bank.balance > 0) {
    const serialNumber = await getNextSequence('invoice', 'INV');
    await Invoice.create({
      serialNumber,
      client: null,
      issueDate: new Date(),
      dueDate: new Date(),
      lines: [{
        description: `Initial balance for ${bank.bankName} - ${bank.accountName}`,
        quantity: 1,
        unitPrice: bank.balance
      }],
      subtotal: bank.balance,
      tax: 0,
      total: bank.balance,
      status: 'paid',
      currency: bank.currency || 'LKR',
      bank: bank._id
    });
  }
  
  res.json(bank);
});

router.put('/:id', auditLog('update', 'bank'), async (req, res) => {
  const bank = await Bank.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!bank) return res.status(404).json({ error: 'Not found' });
  res.json(bank);
});

router.delete('/:id', auditLog('delete', 'bank'), async (req, res) => {
  const bank = await Bank.findByIdAndDelete(req.params.id);
  if (!bank) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
