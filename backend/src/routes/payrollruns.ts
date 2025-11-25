import express from 'express';
import PayrollRun from '../models/PayrollRun';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const runs = await PayrollRun.find()
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const run = await PayrollRun.findById(req.params.id)
    .populate('createdBy', 'email')
    .populate({
      path: 'payrollEntries',
      populate: { path: 'employee', select: 'fullName employeeId' }
    });
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.post('/generate', auditLog('create', 'payrollrun'), async (req: any, res) => {
  const { month, year, employeeIds } = req.body;
  
  const runNumber = await getNextSequence('payrollrun', 'RUN');
  
  const employees = await Employee.find({ 
    _id: { $in: employeeIds },
    status: 'active'
  });
  
  const payrollEntries = [];
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;
  
  for (const employee of employees) {
    const serialNumber = await getNextSequence('payroll', 'PAY');
    const basicSalary = employee.basicSalary;
    const allowances = employee.allowances || 0;
    const grossSalary = basicSalary + allowances;
    
    const epfEmployee = grossSalary * (employee.epfEmployeeRate / 100);
    const epfEmployer = grossSalary * (employee.epfEmployerRate / 100);
    const etf = grossSalary * (employee.etfRate / 100);
    const stampFee = 25;
    
    const deductions = epfEmployee + stampFee;
    const netSalary = grossSalary - deductions;
    
    const payroll = await Payroll.create({
      serialNumber,
      employee: employee._id,
      month,
      year,
      basicSalary,
      allowances,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit: 0,
      stampFee,
      totalDeductions: deductions,
      netSalary,
      status: 'draft',
      createdBy: req.user._id
    });
    
    payrollEntries.push(payroll._id);
    totalGross += grossSalary;
    totalNet += netSalary;
    totalDeductions += deductions;
  }
  
  const run = await PayrollRun.create({
    runNumber,
    month,
    year,
    totalEmployees: employees.length,
    totalGrossSalary: totalGross,
    totalNetSalary: totalNet,
    totalDeductions,
    payrollEntries,
    status: 'draft',
    createdBy: req.user._id
  });
  
  res.json(run);
});

router.put('/:id', auditLog('update', 'payrollrun'), async (req, res) => {
  const run = await PayrollRun.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.delete('/:id', auditLog('delete', 'payrollrun'), async (req, res) => {
  const run = await PayrollRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  
  // Delete associated payroll entries
  await Payroll.deleteMany({ _id: { $in: run.payrollEntries } });
  
  await PayrollRun.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
