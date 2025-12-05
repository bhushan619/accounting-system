import express from 'express';
import Expense from '../models/Expense';
import { requireAuth } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';
import fs from 'fs';
import path from 'path';
import config from '../config';

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
  
  // Admin-created expenses are auto-approved, others need approval
  const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending_accountant';
  const status = req.user.role === 'admin' ? 'approved' : 'pending';
  
  const expense = await Expense.create({
    ...req.body,
    serialNumber,
    approvalStatus,
    status,
    createdBy: req.user._id
  });
  res.json(expense);
});

router.put('/:id', auditLog('update', 'expense'), async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  
  // If approving expense with bank payment method, update bank balance
  if (req.body.status === 'approved' && (req.body.bank || expense.bank)) {
    const bankId = req.body.bank || expense.bank;
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId);
    
    if (bank) {
      // Decrease bank balance for expense payment
      bank.balance -= expense.amount;
      bank.updatedAt = new Date();
      await bank.save();
    }
  }
  
  const updatedExpense = await Expense.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
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
