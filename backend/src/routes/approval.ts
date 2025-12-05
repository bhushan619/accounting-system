import express from 'express';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);

// Get pending approvals for admin only
router.get('/pending', requireRole(['admin']), async (req: any, res) => {
  // Admin sees all pending items (both accountant and admin level)
  const invoiceQuery = { approvalStatus: { $in: ['pending_accountant', 'pending_admin'] } };
  const expenseQuery = { approvalStatus: { $in: ['pending_accountant', 'pending_admin'] } };
  
  const [invoices, expenses, profileRequests] = await Promise.all([
    Invoice.find(invoiceQuery)
      .populate('client')
      .populate('createdBy', 'email fullName')
      .sort({ createdAt: -1 }),
    Expense.find(expenseQuery)
      .populate('vendor')
      .populate('createdBy', 'email fullName')
      .sort({ createdAt: -1 }),
    ProfileUpdateRequest.find({ status: 'pending' })
      .populate('employee', 'employeeId fullName email')
      .populate('requestedBy', 'email fullName')
      .sort({ createdAt: -1 })
  ]);
  
  res.json({ invoices, expenses, profileRequests });
});

// Approve invoice (admin only)
router.post('/invoices/:id/approve', requireRole(['admin']), auditLog('approve', 'invoice'), async (req: any, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  
  if (!['pending_accountant', 'pending_admin'].includes(invoice.approvalStatus)) {
    return res.status(400).json({ error: 'Invoice is not pending approval' });
  }
  
  invoice.approvalStatus = 'approved';
  invoice.approvedByAdmin = req.user._id;
  invoice.adminApprovalDate = new Date();
  invoice.updatedAt = new Date();
  await invoice.save();
  
  res.json(invoice);
});

// Reject invoice (admin only)
router.post('/invoices/:id/reject', requireRole(['admin']), auditLog('reject', 'invoice'), async (req: any, res) => {
  const { reason } = req.body;
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  
  invoice.approvalStatus = 'rejected';
  invoice.rejectedBy = req.user._id;
  invoice.rejectionReason = reason;
  invoice.updatedAt = new Date();
  await invoice.save();
  
  res.json(invoice);
});

// Approve expense (admin only)
router.post('/expenses/:id/approve', requireRole(['admin']), auditLog('approve', 'expense'), async (req: any, res) => {
  const { bankId } = req.body;
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  
  if (!['pending_accountant', 'pending_admin'].includes(expense.approvalStatus)) {
    return res.status(400).json({ error: 'Expense is not pending approval' });
  }
  
  // Update bank balance if applicable
  if (bankId || expense.bank) {
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId || expense.bank);
    if (bank) {
      bank.balance -= expense.amount;
      bank.updatedAt = new Date();
      await bank.save();
    }
    if (bankId) expense.bank = bankId;
  }
  
  expense.approvalStatus = 'approved';
  expense.status = 'approved';
  expense.approvedByAdmin = req.user._id;
  expense.adminApprovalDate = new Date();
  expense.updatedAt = new Date();
  await expense.save();
  
  res.json(expense);
});

// Reject expense (admin only)
router.post('/expenses/:id/reject', requireRole(['admin']), auditLog('reject', 'expense'), async (req: any, res) => {
  const { reason } = req.body;
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  
  expense.approvalStatus = 'rejected';
  expense.status = 'rejected';
  expense.rejectedBy = req.user._id;
  expense.rejectionReason = reason;
  expense.updatedAt = new Date();
  await expense.save();
  
  res.json(expense);
});

// Approve profile update request (admin only)
router.post('/profile-requests/:id/approve', requireRole(['admin']), auditLog('approve', 'profile_update_request'), async (req: any, res) => {
  const request = await ProfileUpdateRequest.findById(req.params.id).populate('employee');
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request is not pending' });
  }
  
  // Apply changes to employee
  const employee = await Employee.findById(request.employee);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const changes = request.requestedChanges;
  if (changes.phone) employee.phone = changes.phone;
  if (changes.address) employee.address = changes.address;
  if (changes.email) employee.email = changes.email;
  if (changes.bankName) employee.bankName = changes.bankName;
  if (changes.bankAccountNumber) employee.bankAccountNumber = changes.bankAccountNumber;
  if (changes.bankAccountName) employee.bankAccountName = changes.bankAccountName;
  if (changes.bankBranch) employee.bankBranch = changes.bankBranch;
  employee.updatedAt = new Date();
  await employee.save();
  
  // Update request status
  request.status = 'approved';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.reviewNotes = req.body.notes || '';
  await request.save();
  
  res.json(request);
});

// Reject profile update request (admin only)
router.post('/profile-requests/:id/reject', requireRole(['admin']), auditLog('reject', 'profile_update_request'), async (req: any, res) => {
  const { reason } = req.body;
  const request = await ProfileUpdateRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request is not pending' });
  }
  
  request.status = 'rejected';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.reviewNotes = reason;
  await request.save();
  
  res.json(request);
});

export default router;
