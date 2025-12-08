import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  role: { type: String, enum: ['admin', 'accountant', 'employee', 'unmarked'] },
  // Link to Employee record (for employee role)
  employeeRef: { type: Schema.Types.ObjectId, ref: 'Employee' },
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: { type: Date, default: Date.now }
});

export default model('User', UserSchema);
