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
  // VAT Support
  vatAmount: { type: Number, default: 0 },
  vatRate: { type: Number, default: 18 }, // Sri Lanka VAT rate
  isVatApplicable: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  // Two-level approval workflow
  approvalStatus: { 
    type: String, 
    enum: ['pending_accountant', 'pending_admin', 'approved', 'rejected'], 
    default: 'pending_accountant' 
  },
  approvedByAccountant: { type: Schema.Types.ObjectId, ref: 'User' },
  accountantApprovalDate: Date,
  approvedByAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  adminApprovalDate: Date,
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Expense', ExpenseSchema);
