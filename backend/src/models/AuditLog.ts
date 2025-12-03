import { Schema, model } from 'mongoose';

const AuditLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // create, update, delete, rollback
  entity: { type: String, required: true }, // invoice, expense, payroll, bank, employee
  entityId: { type: Schema.Types.ObjectId },
  // Enhanced: Full snapshots for rollback capability
  beforeSnapshot: Schema.Types.Mixed, // State before change
  afterSnapshot: Schema.Types.Mixed,  // State after change
  details: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  // Rollback tracking
  isRollback: { type: Boolean, default: false },
  rolledBackFrom: { type: Schema.Types.ObjectId, ref: 'AuditLog' },
  timestamp: { type: Date, default: Date.now }
});

// Index for efficient queries
AuditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

export default model('AuditLog', AuditLogSchema);
