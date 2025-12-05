import { Schema, model } from 'mongoose';

const PayrollRunSchema = new Schema({
  runNumber: { type: String, required: true, unique: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'paid'], default: 'draft' },
  totalEmployees: { type: Number, default: 0 },
  totalGrossSalary: { type: Number, default: 0 },
  totalNetSalary: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  payrollEntries: [{ type: Schema.Types.ObjectId, ref: 'Payroll' }],
  processedDate: Date,
  paidDate: Date,
  notes: String,
  rejectionReason: String,
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  submittedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('PayrollRun', PayrollRunSchema);
