import { Schema, model } from 'mongoose';

const InvoiceLineSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true }
});

const InvoiceSchema = new Schema({
  serialNumber: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  currency: { type: String, enum: ['LKR', 'AED'], default: 'LKR' },
  lines: [InvoiceLineSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  // VAT Support
  vatAmount: { type: Number, default: 0 },
  vatRate: { type: Number, default: 18 }, // Sri Lanka VAT rate
  isVatApplicable: { type: Boolean, default: false },
  notes: String,
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft' },
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
  attachmentUrl: String,
  receiptUrl: String,
  bank: { type: Schema.Types.ObjectId, ref: 'Bank' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Invoice', InvoiceSchema);
