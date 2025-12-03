import { Schema, model } from 'mongoose';

const ProfileUpdateRequestSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Fields that can be updated
  requestedChanges: {
    phone: String,
    address: String,
    email: String,
    // Bank details
    bankName: String,
    bankAccountNumber: String,
    bankAccountName: String,
    bankBranch: String
  },
  // Current values (for comparison)
  currentValues: {
    phone: String,
    address: String,
    email: String,
    bankName: String,
    bankAccountNumber: String,
    bankAccountName: String,
    bankBranch: String
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  createdAt: { type: Date, default: Date.now }
});

export default model('ProfileUpdateRequest', ProfileUpdateRequestSchema);
