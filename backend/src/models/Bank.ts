import { Schema, model } from 'mongoose';

const BankSchema = new Schema({
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  bankName: { type: String, required: true },
  branch: String,
  swiftCode: String,
  balance: { type: Number, default: 0 },
  currency: { type: String, enum: ['LKR', 'AED'], default: 'LKR' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Bank', BankSchema);
