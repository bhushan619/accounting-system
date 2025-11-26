import { Schema, model } from 'mongoose';

const PayrollSchema = new Schema({
  serialNumber: { type: String, required: true, unique: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  grossSalary: { type: Number, required: true },
  epfEmployee: { type: Number, required: true },
  epfEmployer: { type: Number, required: true },
  etf: { type: Number, required: true },
  apit: { type: Number, default: 0 },
  apitEmployer: { type: Number, default: 0 }, // For Scenario B
  stampFee: { type: Number, default: 25 },
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  totalCTC: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  paidDate: Date,
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Payroll', PayrollSchema);
