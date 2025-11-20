import express from 'express';
import AuditLog from '../models/AuditLog';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const logs = await AuditLog.find()
    .populate('user', 'email')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();
  
  const total = await AuditLog.countDocuments();
  
  res.json({
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

export default router;
