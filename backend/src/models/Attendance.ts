import { Schema, model } from 'mongoose';

const AttendanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  workingDays: { type: Number, required: true },
  attendedDays: { type: Number, required: true }, // Supports half days (e.g., 21.5)
  absentDays: { type: Number, required: true },
  attendanceDeduction: { type: Number, default: 0 },
  payrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one attendance record per employee per month/year
AttendanceSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default model('Attendance', AttendanceSchema);
