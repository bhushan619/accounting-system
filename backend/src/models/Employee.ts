import { Schema, model } from 'mongoose';

const EmployeeSchema = new Schema({
  employeeId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  nic: String,
  address: String,
  designation: String,
  department: String,
  joinDate: { type: Date, default: Date.now },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  epfEmployeeRate: { type: Number, default: 8 },
  epfEmployerRate: { type: Number, default: 12 },
  etfRate: { type: Number, default: 3 },
  apitScenario: { type: String, enum: ['employee', 'employer'], default: 'employee' },
  apitRate: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Employee', EmployeeSchema);
