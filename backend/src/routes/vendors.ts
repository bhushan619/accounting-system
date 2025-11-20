import express from 'express';
import Vendor from '../models/Vendor';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const vendors = await Vendor.find().sort({ name: 1 }).lean();
  res.json(vendors);
});

router.get('/:id', async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Not found' });
  res.json(vendor);
});

router.post('/', auditLog('create', 'vendor'), async (req, res) => {
  const vendor = await Vendor.create(req.body);
  res.json(vendor);
});

router.put('/:id', auditLog('update', 'vendor'), async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!vendor) return res.status(404).json({ error: 'Not found' });
  res.json(vendor);
});

router.delete('/:id', auditLog('delete', 'vendor'), async (req, res) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
