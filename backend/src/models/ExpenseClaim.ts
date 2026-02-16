import { Schema, model } from 'mongoose';

const ExpenseClaimSchema = new Schema({
  serialNumber: { type: String, required: true, unique: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['LKR', 'AED'], default: 'LKR' },
  date: { type: Date, required: true },
  receiptUrl: String,
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'paid'], 
    default: 'pending' 
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  paidDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('ExpenseClaim', ExpenseClaimSchema);
