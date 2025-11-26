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
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(payrolls);
});

router.get('/:id', async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee')
    .populate('createdBy', 'email');
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

router.post('/calculate', validateRequest(payrollCalculateSchema), async (req: any, res) => {
  try {
    const { employeeId, month, year, allowances = 0 } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    // Get active tax rates from TaxConfig
    const taxRates = await getActiveTaxRates();
    
    const basicSalary = employee.basicSalary;
    const grossSalary = basicSalary + allowances;
    
    // Use rates from TaxConfig, fall back to employee-specific rates if set
    const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
    const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
    const etfRate = employee.etfRate || taxRates.etf;
    const stampFee = taxRates.stampFee;
    
    const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
    const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
    const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
    
    // Calculate APIT based on slab system with standard deductions
    const apit = calculateAPIT(grossSalary, employee.apitScenario || 'employee');
    
    // Calculate based on APIT scenario
    let totalDeductions: number;
    let netSalary: number;
    let apitEmployer = 0;
    let totalCTC: number;
    
    if (employee.apitScenario === 'employer') {
      // Scenario B: Employer pays APIT
      totalDeductions = epfEmployee + stampFee;
      netSalary = grossSalary - totalDeductions;
      apitEmployer = apit;
      totalCTC = grossSalary + epfEmployer + etf + apitEmployer;
    } else {
      // Scenario A: Employee pays APIT (default)
      totalDeductions = epfEmployee + apit + stampFee;
      netSalary = grossSalary - totalDeductions;
      totalCTC = grossSalary + epfEmployer + etf;
    }
    
    res.json({
      basicSalary,
      allowances,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      apitEmployer,
      stampFee,
      totalDeductions,
      netSalary,
      totalCTC,
      apitScenario: employee.apitScenario
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
