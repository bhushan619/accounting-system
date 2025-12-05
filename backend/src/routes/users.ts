import express from 'express';
import User from '../models/User';
import Employee from '../models/Employee';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
  res.json(users);
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.post('/', auditLog('create', 'user'), async (req, res) => {
  const { email, password, fullName, role, employeeRef } = req.body;
  
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  // If role is employee, employeeRef is required
  if (role === 'employee' && !employeeRef) {
    return res.status(400).json({ error: 'Employee reference is required for employee role' });
  }
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ 
    email, 
    password: hashed, 
    fullName, 
    role,
    employeeRef: role === 'employee' ? employeeRef : undefined
  });
  
  // Link employee to user account
  if (role === 'employee' && employeeRef) {
    await Employee.findByIdAndUpdate(employeeRef, { userAccount: user._id });
  }
  
  res.json({ ...user.toObject(), password: undefined });
});

router.put('/:id', auditLog('update', 'user'), async (req, res) => {
  const { password, employeeRef, ...updateData } = req.body;
  
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  
  // Get old user to check for role/employee changes
  const oldUser = await User.findById(req.params.id);
  if (!oldUser) return res.status(404).json({ error: 'Not found' });
  
  // If role is employee, employeeRef is required
  if (updateData.role === 'employee' && !employeeRef) {
    return res.status(400).json({ error: 'Employee reference is required for employee role' });
  }
  
  // Update employeeRef based on role
  if (updateData.role === 'employee') {
    updateData.employeeRef = employeeRef;
  } else {
    updateData.employeeRef = undefined;
  }
  
  // Unlink old employee if changing
  if (oldUser.employeeRef && oldUser.employeeRef.toString() !== employeeRef) {
    await Employee.findByIdAndUpdate(oldUser.employeeRef, { $unset: { userAccount: 1 } });
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  ).select('-password');
  
  // Link new employee to user account
  if (updateData.role === 'employee' && employeeRef) {
    await Employee.findByIdAndUpdate(employeeRef, { userAccount: user!._id });
  }
  
  res.json(user);
});

router.delete('/:id', auditLog('delete', 'user'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  
  // Unlink employee if exists
  if (user.employeeRef) {
    await Employee.findByIdAndUpdate(user.employeeRef, { $unset: { userAccount: 1 } });
  }
  
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
