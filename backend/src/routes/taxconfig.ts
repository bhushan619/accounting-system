import express from 'express';
import TaxConfig from '../models/TaxConfig';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const configs = await TaxConfig.find().sort({ applicableFrom: -1 }).lean();
  res.json(configs);
});

router.get('/:id', async (req, res) => {
  const config = await TaxConfig.findById(req.params.id);
  if (!config) return res.status(404).json({ error: 'Not found' });
  res.json(config);
});

router.post('/', requireRole('admin'), auditLog('create', 'taxconfig'), async (req, res) => {
  const config = await TaxConfig.create(req.body);
  res.json(config);
});

router.put('/:id', requireRole('admin'), auditLog('update', 'taxconfig'), async (req, res) => {
  const config = await TaxConfig.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!config) return res.status(404).json({ error: 'Not found' });
  res.json(config);
});

router.delete('/:id', requireRole('admin'), auditLog('delete', 'taxconfig'), async (req, res) => {
  const config = await TaxConfig.findByIdAndDelete(req.params.id);
  if (!config) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
