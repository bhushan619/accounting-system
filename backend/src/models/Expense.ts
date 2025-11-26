import { Schema, model } from 'mongoose';

const ExpenseSchema = new Schema({
  serialNumber: { type: String, required: true, unique: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['LKR', 'AED'], default: 'LKR' },
  date: { type: Date, default: Date.now },
  billUrl: String,
  receiptUrl: String,
  paymentMethod: { type: String, enum: ['cash', 'bank', 'card'], default: 'cash' },
  bank: { type: Schema.Types.ObjectId, ref: 'Bank' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Expense', ExpenseSchema);
