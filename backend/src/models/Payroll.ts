import { Schema, model } from 'mongoose';

const PayrollSchema = new Schema({
  serialNumber: { type: String, required: true, unique: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  performanceSalary: { type: Number, default: 0 }, // Performance salary based on status
  transportAllowance: { type: Number, default: 0 }, // Transport allowance
  grossSalary: { type: Number, required: true },
  epfEmployee: { type: Number, required: true },
  epfEmployer: { type: Number, required: true },
  etf: { type: Number, required: true },
  apit: { type: Number, default: 0 }, // APIT tax - Scenario A only (employee pays)
  stampFee: { type: Number, default: 25 },
  deductionAmount: { type: Number, default: 0 }, // Additional salary deduction amount
  deductionReason: { type: String, default: '' }, // Reason for the deduction
  deficitSalary: { type: Number, default: 0 }, // Deficit salary between probation end and status update
  includeDeficitInPayroll: { type: Boolean, default: false }, // Flag to include deficit in payroll
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  totalCTC: { type: Number, required: true },
  workingDays: { type: Number, default: 30 }, // Working days in the month
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  paidDate: Date,
  notes: String,
  bank: { type: Schema.Types.ObjectId, ref: 'Bank' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Payroll', PayrollSchema);
