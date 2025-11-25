import express from 'express';
import User from '../models/User';
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
  const { email, password, fullName, role } = req.body;
  
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, fullName, role });
  
  res.json({ ...user.toObject(), password: undefined });
});

router.put('/:id', auditLog('update', 'user'), async (req, res) => {
  const { password, ...updateData } = req.body;
  
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  ).select('-password');
  
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.delete('/:id', auditLog('delete', 'user'), async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
