import express from 'express';
import User from '../models/User';
import Employee from '../models/Employee';
import Payroll from '../models/Payroll';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import { requireAuth, requireRole } from '../middleware/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// Employee self-registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, employeeId } = req.body;
    
    // Check if employee exists
    const employee = await Employee.findOne({ employeeId, email });
    if (!employee) {
      return res.status(404).json({ error: 'No employee record found with this ID and email combination' });
    }
    
    // Check if already has account
    if (employee.userAccount) {
      return res.status(400).json({ error: 'Account already exists for this employee' });
    }
    
    // Check if email already registered as user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create user account
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      fullName: employee.fullName,
      role: 'employee',
      employeeRef: employee._id
    });
    
    // Link user to employee
    employee.userAccount = user._id;
    await employee.save();
    
    const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
    res.json({ 
      access: token, 
      user: { id: user._id, email: user.email, role: user.role, employeeId: employee.employeeId }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Employee portal routes (requires employee role)
router.use(requireAuth);

// Get employee's own profile
router.get('/profile', requireRole(['employee']), async (req: any, res) => {
  const employee = await Employee.findOne({ userAccount: req.user._id });
  if (!employee) return res.status(404).json({ error: 'Employee profile not found' });
  res.json(employee);
});

// Get employee's payslips
router.get('/payslips', requireRole(['employee']), async (req: any, res) => {
  const employee = await Employee.findOne({ userAccount: req.user._id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const payrolls = await Payroll.find({ 
    employee: employee._id,
    status: { $in: ['approved', 'paid'] }
  })
    .populate('bank', 'bankName accountName')
    .sort({ year: -1, month: -1 });
  
  res.json(payrolls);
});

// Get specific payslip
router.get('/payslips/:id', requireRole(['employee']), async (req: any, res) => {
  const employee = await Employee.findOne({ userAccount: req.user._id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const payroll = await Payroll.findOne({ 
    _id: req.params.id,
    employee: employee._id
  }).populate('bank', 'bankName accountName');
  
  if (!payroll) return res.status(404).json({ error: 'Payslip not found' });
  res.json(payroll);
});

// Submit profile update request
router.post('/profile-update-request', requireRole(['employee']), auditLog('create', 'profile_update_request'), async (req: any, res) => {
  try {
    const employee = await Employee.findOne({ userAccount: req.user._id });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    const { phone, address, email, bankName, bankAccountNumber, bankAccountName, bankBranch } = req.body;
    
    // Create update request
    const request = await ProfileUpdateRequest.create({
      employee: employee._id,
      requestedBy: req.user._id,
      requestedChanges: {
        phone, address, email,
        bankName, bankAccountNumber, bankAccountName, bankBranch
      },
      currentValues: {
        phone: employee.phone,
        address: employee.address,
        email: employee.email,
        bankName: employee.bankName,
        bankAccountNumber: employee.bankAccountNumber,
        bankAccountName: employee.bankAccountName,
        bankBranch: employee.bankBranch
      }
    });
    
    res.json(request);
  } catch (error) {
    console.error('Profile update request error:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Get own update requests
router.get('/profile-update-requests', requireRole(['employee']), async (req: any, res) => {
  const employee = await Employee.findOne({ userAccount: req.user._id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const requests = await ProfileUpdateRequest.find({ employee: employee._id })
    .populate('reviewedBy', 'email fullName')
    .sort({ createdAt: -1 });
  
  res.json(requests);
});

// Admin routes for managing employee accounts and update requests
router.get('/admin/update-requests', requireRole(['admin']), async (req, res) => {
  const requests = await ProfileUpdateRequest.find({ status: 'pending' })
    .populate('employee', 'employeeId fullName email')
    .populate('requestedBy', 'email fullName')
    .sort({ createdAt: -1 });
  
  res.json(requests);
});

router.post('/admin/update-requests/:id/approve', requireRole(['admin']), auditLog('approve', 'profile_update_request'), async (req: any, res) => {
  try {
    const request = await ProfileUpdateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    
    // Apply changes to employee
    const employee = await Employee.findById(request.employee);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    const changes = request.requestedChanges;
    if (changes.phone !== undefined) employee.phone = changes.phone;
    if (changes.address !== undefined) employee.address = changes.address;
    if (changes.email !== undefined) employee.email = changes.email;
    if (changes.bankName !== undefined) employee.bankName = changes.bankName;
    if (changes.bankAccountNumber !== undefined) employee.bankAccountNumber = changes.bankAccountNumber;
    if (changes.bankAccountName !== undefined) employee.bankAccountName = changes.bankAccountName;
    if (changes.bankBranch !== undefined) employee.bankBranch = changes.bankBranch;
    employee.updatedAt = new Date();
    await employee.save();
    
    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    
    res.json(request);
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

router.post('/admin/update-requests/:id/reject', requireRole(['admin']), auditLog('reject', 'profile_update_request'), async (req: any, res) => {
  try {
    const { notes } = req.body;
    const request = await ProfileUpdateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    
    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNotes = notes;
    await request.save();
    
    res.json(request);
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Admin: Link existing employee to user account
router.post('/admin/link-employee', requireRole(['admin']), async (req: any, res) => {
  try {
    const { employeeId, userId } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.role !== 'employee') {
      user.role = 'employee';
    }
    user.employeeRef = employee._id;
    await user.save();
    
    employee.userAccount = user._id;
    await employee.save();
    
    res.json({ message: 'Employee linked to user account', employee, user });
  } catch (error) {
    console.error('Link employee error:', error);
    res.status(500).json({ error: 'Failed to link employee' });
  }
});

// Admin: Create employee user account
router.post('/admin/create-employee-account', requireRole(['admin']), async (req: any, res) => {
  try {
    const { employeeId, password } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    if (employee.userAccount) {
      return res.status(400).json({ error: 'Employee already has an account' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: employee.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: employee.email,
      password: hashed,
      fullName: employee.fullName,
      role: 'employee',
      employeeRef: employee._id
    });
    
    employee.userAccount = user._id;
    await employee.save();
    
    res.json({ message: 'Account created', user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Create employee account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export default router;
