import express from 'express';
import Client from '../models/Client';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  res.json(clients);
});

router.get('/:id', async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json(client);
});

router.post('/', auditLog('create', 'client'), async (req, res) => {
  const client = await Client.create(req.body);
  res.json(client);
});

router.put('/:id', auditLog('update', 'client'), async (req, res) => {
  const client = await Client.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json(client);
});

router.delete('/:id', auditLog('delete', 'client'), async (req, res) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
