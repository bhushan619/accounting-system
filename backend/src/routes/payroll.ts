import express from 'express';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';
import { validateRequest } from '../middleware/validateRequest';
import { payrollCalculateSchema, payrollCreateSchema } from '../validation/payroll';
import { getActiveTaxRates, calculateAPIT } from '../services/taxService';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const payrolls = await Payroll.find()
    .populate('employee')
    .populate('bank')
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(payrolls);
});

router.get('/:id', async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee')
    .populate('bank')
    .populate('createdBy', 'email');
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

// Helper: Get working days for a calendar month (including weekends)
function getWorkingDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // Returns total days in month
}

router.post('/calculate', validateRequest(payrollCalculateSchema), async (req: any, res) => {
  try {
    const { employeeId, month, year, performanceSalary: customPerformance, transportAllowance: customTransport } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    // Get active tax rates from TaxConfig
    const taxRates = await getActiveTaxRates();
    const workingDays = getWorkingDaysInMonth(month, year);
    
    const basicSalary = employee.basicSalary;
    
    // Get current performance salary based on status/probation
    let defaultPerformanceSalary = 0;
    if (employee.status === 'confirmed') {
      defaultPerformanceSalary = employee.performanceSalaryConfirmed || 0;
    } else if (employee.status === 'under_probation') {
      if (employee.probationEndDate && new Date() > employee.probationEndDate) {
        defaultPerformanceSalary = employee.performanceSalaryConfirmed || 0;
      } else {
        defaultPerformanceSalary = employee.performanceSalaryProbation || 0;
      }
    }
    
    const performanceSalary = customPerformance ?? defaultPerformanceSalary;
    const transportAllowance = customTransport ?? (employee.transportAllowance || 0);
    const grossSalary = basicSalary + performanceSalary + transportAllowance;
    
    // Use rates from TaxConfig, fall back to employee-specific rates if set
    const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
    const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
    const etfRate = employee.etfRate || taxRates.etf;
    const stampFee = taxRates.stampFee;
    
    // EPF and ETF calculated on (Basic + Performance Salary)
    const epfEtfBase = basicSalary + performanceSalary;
    const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
    const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
    const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
    
    // Calculate APIT - Scenario A only (employee pays)
    const apit = calculateAPIT(grossSalary, 'employee');
    
    // Scenario A: Employee pays APIT - deducted from salary
    const totalDeductions = epfEmployee + apit + stampFee;
    const netSalary = grossSalary - totalDeductions;
    const totalCTC = grossSalary + epfEmployer + etf;
    
    res.json({
      basicSalary,
      performanceSalary,
      transportAllowance,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      stampFee,
      totalDeductions,
      netSalary,
      totalCTC,
      workingDays
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

router.post('/', validateRequest(payrollCreateSchema), auditLog('create', 'payroll'), async (req: any, res) => {
  try {
    const serialNumber = await getNextSequence('payroll', 'PAY');
    const payroll = await Payroll.create({
      ...req.body,
      serialNumber,
      createdBy: req.user._id
    });
    res.json(payroll);
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ error: 'Failed to create payroll' });
  }
});

router.put('/:id', auditLog('update', 'payroll'), async (req, res) => {
  const payroll = await Payroll.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

router.delete('/:id', auditLog('delete', 'payroll'), async (req, res) => {
  const payroll = await Payroll.findByIdAndDelete(req.params.id);
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
