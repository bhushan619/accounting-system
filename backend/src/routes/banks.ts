import express from 'express';
import Bank from '../models/Bank';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

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
