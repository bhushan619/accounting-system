import { Schema, model } from 'mongoose';

const TaxConfigSchema = new Schema({
  name: { type: String, required: true },
  taxType: { type: String, enum: ['vat', 'income', 'withholding'], required: true },
  rate: { type: Number, required: true },
  applicableFrom: { type: Date, required: true },
  applicableTo: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('TaxConfig', TaxConfigSchema);
