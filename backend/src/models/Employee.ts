import { Schema, model } from 'mongoose';

const EmployeeSchema = new Schema({
  employeeId: { type: String, required: true, unique: true },
  epfNumber: String, // EPF Number for statutory records
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  nic: String,
  address: String,
  basicInformation: String, // New textarea field
  designation: String,
  department: { 
    type: String, 
    enum: ['HR department', 'R&D department', ''],
    default: ''
  },
  joinDate: { type: Date, default: Date.now },
  basicSalary: { type: Number, required: true },
  transportAllowance: { type: Number, default: 0 }, // Renamed from allowances
  performanceSalaryProbation: { type: Number, default: 0 }, // Under probation
  performanceSalaryConfirmed: { type: Number, default: 0 }, // Post probation
  probationEndDate: { type: Date }, // Probation period end date
  workingDaysPerMonth: { type: Number, default: 30 }, // Working days per calendar month
  epfEmployeeRate: { type: Number, default: 8 },
  epfEmployerRate: { type: Number, default: 12 },
  etfRate: { type: Number, default: 3 },
  // APIT scenario removed - always use Scenario A (employee pays)
  status: { 
    type: String, 
    enum: ['under_probation', 'confirmed', 'closed'], 
    default: 'under_probation' 
  },
  statusUpdateDate: { type: Date }, // Date when status was changed to 'confirmed'
  // Bank details for salary payment
  bankName: String,
  bankAccountNumber: String,
  bankAccountName: String,
  bankBranch: String,
  // Link to User account (for self-service portal)
  userAccount: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual to get current performance salary based on status/date
EmployeeSchema.virtual('currentPerformanceSalary').get(function() {
  if (this.status === 'confirmed') {
    return this.performanceSalaryConfirmed;
  }
  if (this.status === 'under_probation') {
    // Check if probation period has ended
    if (this.probationEndDate && new Date() > this.probationEndDate) {
      return this.performanceSalaryConfirmed;
    }
    return this.performanceSalaryProbation;
  }
  return 0;
});

export default model('Employee', EmployeeSchema);
