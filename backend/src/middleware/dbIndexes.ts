/**
 * Ensures MongoDB indexes are created on application startup.
 * Call once from index.ts after mongoose.connect().
 */
import Employee from '../models/Employee';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Payroll from '../models/Payroll';
import PayrollRun from '../models/PayrollRun';
import AuditLog from '../models/AuditLog';

export async function ensureIndexes(): Promise<void> {
  try {
    // Employees
    await Employee.collection.createIndex({ status: 1 });
    await Employee.collection.createIndex({ closeDate: 1 });
    await Employee.collection.createIndex({ fullName: 1 });

    // Invoices
    await Invoice.collection.createIndex({ status: 1, approvalStatus: 1 });
    await Invoice.collection.createIndex({ issueDate: -1 });
    await Invoice.collection.createIndex({ createdAt: -1 });
    await Invoice.collection.createIndex({ client: 1 });

    // Expenses
    await Expense.collection.createIndex({ status: 1, approvalStatus: 1 });
    await Expense.collection.createIndex({ date: -1 });
    await Expense.collection.createIndex({ category: 1 });

    // Payroll
    await Payroll.collection.createIndex({ employee: 1, month: 1, year: 1 });
    await Payroll.collection.createIndex({ status: 1 });
    await Payroll.collection.createIndex({ year: -1, month: -1 });

    // PayrollRun
    await PayrollRun.collection.createIndex({ year: -1, month: -1 });
    await PayrollRun.collection.createIndex({ status: 1 });

    // AuditLog
    await AuditLog.collection.createIndex({ createdAt: -1 });
    await AuditLog.collection.createIndex({ action: 1, entity: 1 });

    console.log('✅ MongoDB indexes ensured');
  } catch (err) {
    console.error('⚠️  Failed to create indexes:', err);
  }
}
