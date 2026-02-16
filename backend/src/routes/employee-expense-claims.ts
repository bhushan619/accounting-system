import express from 'express';
import ExpenseClaim from '../models/ExpenseClaim';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { getNextSequence } from '../services/counterService';
import { createUploader } from '../services/uploadService';

const router = express.Router();
const receiptUpload = createUploader('expense-claims');

router.use(requireAuth);

// Employee: Submit expense claim
router.post('/', requireRole(['employee']), receiptUpload.single('receipt'), async (req: any, res) => {
  try {
    const employee = await Employee.findOne({ userAccount: req.user._id });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const { category, description, amount, currency, date } = req.body;
    const serialNumber = await getNextSequence('expense_claim', 'ECL');

    const claim = await ExpenseClaim.create({
      serialNumber,
      employee: employee._id,
      submittedBy: req.user._id,
      category,
      description,
      amount: Number(amount),
      currency: currency || 'LKR',
      date: new Date(date),
      receiptUrl: req.file ? `/uploads/expense-claims/${req.file.filename}` : undefined
    });

    res.json(claim);
  } catch (error) {
    console.error('Expense claim submission error:', error);
    res.status(500).json({ error: 'Failed to submit expense claim' });
  }
});

// Employee: Get own expense claims
router.get('/my-claims', requireRole(['employee']), async (req: any, res) => {
  try {
    const employee = await Employee.findOne({ userAccount: req.user._id });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const claims = await ExpenseClaim.find({ employee: employee._id })
      .populate('reviewedBy', 'email fullName')
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Employee: Delete own pending claim
router.delete('/:id', requireRole(['employee']), async (req: any, res) => {
  try {
    const employee = await Employee.findOne({ userAccount: req.user._id });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const claim = await ExpenseClaim.findOne({ _id: req.params.id, employee: employee._id });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending claims' });

    await ExpenseClaim.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});

// Admin: Get all pending expense claims
router.get('/admin/pending', requireRole(['admin']), async (req, res) => {
  try {
    const claims = await ExpenseClaim.find({ status: 'pending' })
      .populate('employee', 'employeeId fullName email')
      .populate('submittedBy', 'email fullName')
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Admin: Get all expense claims
router.get('/admin/all', requireRole(['admin']), async (req, res) => {
  try {
    const claims = await ExpenseClaim.find()
      .populate('employee', 'employeeId fullName email')
      .populate('submittedBy', 'email fullName')
      .populate('reviewedBy', 'email fullName')
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Admin: Approve expense claim
router.post('/admin/:id/approve', requireRole(['admin']), auditLog('approve', 'expense_claim'), async (req: any, res) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already processed' });

    claim.status = 'approved';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.reviewNotes = req.body.notes || '';
    claim.updatedAt = new Date();
    await claim.save();

    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

// Admin: Reject expense claim
router.post('/admin/:id/reject', requireRole(['admin']), auditLog('reject', 'expense_claim'), async (req: any, res) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already processed' });

    claim.status = 'rejected';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.reviewNotes = req.body.notes || '';
    claim.updatedAt = new Date();
    await claim.save();

    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

// Admin: Mark claim as paid
router.post('/admin/:id/paid', requireRole(['admin']), auditLog('update', 'expense_claim'), async (req: any, res) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'approved') return res.status(400).json({ error: 'Claim must be approved first' });

    claim.status = 'paid';
    claim.paidDate = new Date();
    claim.updatedAt = new Date();
    await claim.save();

    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

export default router;
