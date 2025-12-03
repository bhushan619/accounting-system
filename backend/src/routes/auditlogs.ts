import express from 'express';
import AuditLog from '../models/AuditLog';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Payroll from '../models/Payroll';
import Bank from '../models/Bank';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Get all audit logs (with filters)
router.get('/', requireRole(['admin']), async (req, res) => {
  const { entity, entityId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const query: any = {};
  if (entity) query.entity = entity;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate as string);
    if (endDate) query.timestamp.$lte = new Date(endDate as string);
  }
  
  const logs = await AuditLog.find(query)
    .populate('user', 'email fullName role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();
  
  const total = await AuditLog.countDocuments(query);
  
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

// Get change history for a specific entity
router.get('/history/:entity/:entityId', async (req, res) => {
  const { entity, entityId } = req.params;
  
  const logs = await AuditLog.find({ entity, entityId })
    .populate('user', 'email fullName role')
    .populate('rolledBackFrom')
    .sort({ timestamp: -1 });
  
  res.json(logs);
});

// Rollback to a previous state (Admin only)
router.post('/rollback/:logId', requireRole(['admin']), async (req: any, res) => {
  try {
    const auditLog = await AuditLog.findById(req.params.logId);
    if (!auditLog) return res.status(404).json({ error: 'Audit log not found' });
    
    if (!auditLog.beforeSnapshot) {
      return res.status(400).json({ error: 'No snapshot available for rollback' });
    }
    
    const { entity, entityId, beforeSnapshot } = auditLog;
    
    // Get the model based on entity type
    let Model: any;
    switch (entity) {
      case 'invoice':
        Model = Invoice;
        break;
      case 'expense':
        Model = Expense;
        break;
      case 'payroll':
        Model = Payroll;
        break;
      case 'bank':
        Model = Bank;
        break;
      default:
        return res.status(400).json({ error: 'Rollback not supported for this entity type' });
    }
    
    // Get current state before rollback
    const currentDoc = await Model.findById(entityId).lean();
    if (!currentDoc) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Prepare rollback data (exclude _id and timestamps)
    const { _id, createdAt, __v, ...rollbackData } = beforeSnapshot;
    rollbackData.updatedAt = new Date();
    
    // Perform rollback
    const updatedDoc = await Model.findByIdAndUpdate(
      entityId,
      rollbackData,
      { new: true }
    );
    
    // Create rollback audit log
    await AuditLog.create({
      user: req.user._id,
      action: 'rollback',
      entity,
      entityId,
      beforeSnapshot: currentDoc,
      afterSnapshot: updatedDoc,
      isRollback: true,
      rolledBackFrom: auditLog._id,
      details: {
        rolledBackToTimestamp: auditLog.timestamp,
        originalAction: auditLog.action
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      message: 'Rollback successful', 
      entity: updatedDoc,
      rolledBackFrom: auditLog.timestamp
    });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ error: 'Rollback failed' });
  }
});

// Get rollback preview (what will change)
router.get('/rollback-preview/:logId', requireRole(['admin']), async (req, res) => {
  const auditLogEntry = await AuditLog.findById(req.params.logId);
  if (!auditLogEntry) return res.status(404).json({ error: 'Audit log not found' });
  
  if (!auditLogEntry.beforeSnapshot) {
    return res.status(400).json({ error: 'No snapshot available for rollback' });
  }
  
  // Get current state
  let Model: any;
  switch (auditLogEntry.entity) {
    case 'invoice':
      Model = Invoice;
      break;
    case 'expense':
      Model = Expense;
      break;
    case 'payroll':
      Model = Payroll;
      break;
    case 'bank':
      Model = Bank;
      break;
    default:
      return res.status(400).json({ error: 'Rollback not supported for this entity type' });
  }
  
  const currentDoc = await Model.findById(auditLogEntry.entityId).lean();
  
  res.json({
    currentState: currentDoc,
    rollbackToState: auditLogEntry.beforeSnapshot,
    timestamp: auditLogEntry.timestamp,
    originalAction: auditLogEntry.action
  });
});

export default router;
