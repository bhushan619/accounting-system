import { Schema, model } from 'mongoose';

const TaxBracketSchema = new Schema({
  minIncome: { type: Number, required: true },
  maxIncome: { type: Number }, // null/undefined means no upper limit
  rate: { type: Number, required: true }
}, { _id: false });

const TaxConfigSchema = new Schema({
  name: { type: String, required: true },
  taxType: { type: String, enum: ['apit', 'epf_employee', 'epf_employer', 'etf', 'stamp_fee', 'vat', 'income', 'withholding'], required: true },
  rate: { type: Number }, // For simple rates like EPF, ETF, Stamp Fee
  brackets: [TaxBracketSchema], // For progressive rates like APIT
  applicableFrom: { type: Date, required: true },
  applicableTo: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('TaxConfig', TaxConfigSchema);
