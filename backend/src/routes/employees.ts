import express from 'express';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const employees = await Employee.find().sort({ fullName: 1 }).lean();
  res.json(employees);
});

router.get('/:id', async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.post('/', auditLog('create', 'employee'), async (req, res) => {
  const employee = await Employee.create(req.body);
  res.json(employee);
});

router.put('/:id', auditLog('update', 'employee'), async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.delete('/:id', auditLog('delete', 'employee'), async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
