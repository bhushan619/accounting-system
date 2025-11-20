import express from 'express';
import Expense from '../models/Expense';
import { requireAuth } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);

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
  const expense = await Expense.create({
    ...req.body,
    serialNumber,
    createdBy: req.user._id
  });
  res.json(expense);
});

router.put('/:id', auditLog('update', 'expense'), async (req, res) => {
  const expense = await Expense.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!expense) return res.status(404).json({ error: 'Not found' });
  res.json(expense);
});

router.delete('/:id', auditLog('delete', 'expense'), async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
